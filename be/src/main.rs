use base64::Engine;
use flate2::read::GzDecoder;
use futures_util::FutureExt;
use prost::Message;
use regex::Regex;
use rust_socketio::{asynchronous::ClientBuilder, Payload, TransportType};
use serde_json::json;
use std::io::Read;
use std::time::Duration;

#[tokio::main]
async fn main() {
    // prasarana_data().await;
    prasarana_websocket().await;
}

// Data OpenDOSM Prasarana - guna protobuf
#[allow(dead_code)]
async fn prasarana_data() {
    let endpoint =
        "https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-kl";
    let response = reqwest::get(endpoint).await.unwrap();
    let body = response.bytes().await.unwrap();
    let feed = gtfs_realtime::FeedMessage::decode(body).unwrap();
    println!("Feed: {:?}", feed);
}

// Decode base64 + gzip compressed data from the websocket
fn decode_bus_data(encoded: &str) -> Option<String> {
    // Decode base64
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .ok()?;

    // Decompress gzip
    let mut decoder = GzDecoder::new(&decoded[..]);
    let mut decompressed = String::new();
    decoder.read_to_string(&mut decompressed).ok()?;

    Some(decompressed)
}

// Prasarana Websocket data - live bus positions
async fn prasarana_websocket() {
    // Fetch a specific route page to get session data
    // Using route 300 (KLCC-Bukit Bintang) as example
    let route_url = "https://myrapidbus.prasarana.com.my/kiosk/300";

    println!("Fetching route page to get session data...");
    let client = reqwest::Client::builder()
        .cookie_store(true)
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        .build()
        .unwrap();

    let response = client.get(route_url).send().await.unwrap();
    let html = response.text().await.unwrap();

    // Extract session ID and route info from the page
    let sid_regex = Regex::new(r"var\s+sid\s*=\s*'([^']+)'").unwrap();
    let prm_regex = Regex::new(r"var\s+prm\s*=\s*'([^']*)'").unwrap();
    let route_regex = Regex::new(r"var\s+no_route\s*=\s*'([^']*)'").unwrap();

    let sid = sid_regex
        .captures(&html)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "".to_string());

    let prm = prm_regex
        .captures(&html)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "rapidkl".to_string());

    let no_route = route_regex
        .captures(&html)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "300".to_string());

    println!(
        "Extracted - sid: {}, prm: {}, no_route: {}",
        sid, prm, no_route
    );

    // Connect to Socket.IO server
    let socket_url = "https://rapidbus-socketio-avl.prasarana.com.my";

    println!("Connecting to Socket.IO server: {}", socket_url);

    let sid_clone = sid.clone();
    let prm_clone = prm.clone();
    let no_route_clone = no_route.clone();

    // Callback for receiving bus data
    let callback = |payload: Payload, _socket: rust_socketio::asynchronous::Client| {
        async move {
            match payload {
                Payload::Text(values) => {
                    for value in values {
                        // The data comes as a base64+gzip encoded string
                        if let Some(encoded_str) = value.as_str() {
                            match decode_bus_data(encoded_str) {
                                Some(decoded) => {
                                    // Try to parse as JSON
                                    match serde_json::from_str::<serde_json::Value>(&decoded) {
                                        Ok(json_data) => {
                                            println!("\n=== Live Bus Data ===");
                                            println!(
                                                "{}",
                                                serde_json::to_string_pretty(&json_data).unwrap()
                                            );
                                        }
                                        Err(_) => {
                                            // Not JSON, print raw
                                            println!("\n=== Raw Data ===");
                                            println!("{}", decoded);
                                        }
                                    }
                                }
                                None => {
                                    println!("Failed to decode: {}", encoded_str);
                                }
                            }
                        } else {
                            println!(
                                "Non-string data: {}",
                                serde_json::to_string_pretty(&value)
                                    .unwrap_or_else(|_| value.to_string())
                            );
                        }
                    }
                }
                Payload::Binary(bin) => {
                    println!("Received binary data: {} bytes", bin.len());
                }
                _ => {}
            }
        }
        .boxed()
    };

    // Build and connect the socket
    let socket = ClientBuilder::new(socket_url)
        .transport_type(TransportType::Websocket)
        .on("onFts-client", callback)
        .on("error", |err, _| {
            async move {
                eprintln!("Socket error: {:?}", err);
            }
            .boxed()
        })
        .on("connect", move |_, socket| {
            let sid = sid_clone.clone();
            let prm = prm_clone.clone();
            let no_route = no_route_clone.clone();
            async move {
                println!("Connected to WebSocket server!");

                // Emit the onFts-reload event to request data
                let payload = json!({
                    "sid": sid,
                    "uid": "",
                    "provider": prm,
                    "route": no_route
                });

                println!("Emitting onFts-reload: {}", payload);
                if let Err(e) = socket.emit("onFts-reload", payload).await {
                    eprintln!("Failed to emit: {:?}", e);
                }
            }
            .boxed()
        })
        .connect()
        .await;

    match socket {
        Ok(socket) => {
            println!("Socket connected successfully!");

            // Keep connection alive and periodically request updates
            loop {
                tokio::time::sleep(Duration::from_secs(5)).await;

                let payload = json!({
                    "sid": sid,
                    "uid": "",
                    "provider": prm,
                    "route": no_route
                });

                if let Err(e) = socket.emit("onFts-reload", payload).await {
                    eprintln!("Failed to emit reload: {:?}", e);
                    break;
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to connect: {:?}", e);
        }
    }
}

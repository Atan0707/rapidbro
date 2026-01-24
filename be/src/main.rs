use prost::Message;
fn main() {
    // prasarana_data();
}

// Data OpenDOSM Prasarana - guna protobuf
#[tokio::main]
async fn prasarana_data() {
    let endpoint = "https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-kl";
    let response = reqwest::get(endpoint).await.unwrap();
    let body = response.bytes().await.unwrap();
    let feed = gtfs_realtime::FeedMessage::decode(body).unwrap();
    println!("Feed: {:?}", feed);
}

// Prasarana Websocket data


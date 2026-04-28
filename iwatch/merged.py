import paho.mqtt.client as mqtt
import json
import iwatch_simulator
import time
import requests
import os
import csv
import copy
import smart_bin_pipeline

THING_ID = "org.Iotp2c/iwatch"
MQTT_TOPIC = f"{THING_ID}/things/twin/commands/modify"
SUBSCRIBE_TOPIC = f"{THING_ID}/things/twin/events/modified"

MQTT_BROKER = "192.168.177.1"
MQTT_PORT = 1883
USERNAME = "ditto"
PASSWORD = "ditto"


# ================= CSV SAVE =================
def save_data_to_csv(data, filename="smartbin_data.csv"):
    file_exists = os.path.isfile(filename)

    with open(filename, mode='a', newline='') as csv_file:
        fieldnames = [
            'bin_id',
            'timestamp',
            'fill_level',
            'gas_level',
            'temperature',
            'humidity',
            'weight',
            'latitude',
            'longitude',
            'result'
        ]

        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()

        # 🔥 loop over all bins
        for bin_id, bin_data in data.items():
            writer.writerow({
                'bin_id': bin_data['bin_id'],
                'timestamp': bin_data['timestamp'],
                'fill_level': bin_data['fill_level'],
                'gas_level': bin_data['gas_level'],
                'temperature': bin_data['temperature'],
                'humidity': bin_data['humidity'],
                'weight': bin_data['weight'],
                'latitude': bin_data['location']['latitude'],
                'longitude': bin_data['location']['longitude'],
                'result': bin_data['result']
            })


# ================= DITTO CONFIG =================
def configure_outbound_mapping():
    url = "http://localhost:8080/api/2/connections/my-mqtt-outbound"
    auth = ('ditto', 'ditto')

    payload = {
        "targets": [
            {
                "address": "org.Iotp2c/iwatch/things/twin/events/modified",
                "topics": ["things/live/messages/my-message"],
                "authorizationContext": []
            }
        ],
        "source": {
            "type": "things",
            "topics": ["things/twin/events", "things/live/commands"]
        },
        "protocol": {
            "type": "mqtt",
            "uri": "tcp://ditto:ditto@192.168.177.1:1883",
            "clientId": "ditto-connection"
        },
        "enabled": True
    }

    response = requests.put(
        url,
        auth=auth,
        headers={"Content-Type": "application/json"},
        data=json.dumps(payload)
    )

    print(response.status_code, response.text)


configure_outbound_mapping()


# ================= SEND UPDATE =================
def send_updated_thing_to_ditto(updated_payload):

    url = "http://localhost:8080/api/2/things/org.Iotp2c:iwatch"
    auth = ('ditto', 'ditto')
    headers = {"Content-Type": "application/json"}

    data = {
        "attributes": updated_payload['value']['attributes']
    }

    response = requests.put(
        url,
        auth=auth,
        headers=headers,
        data=json.dumps(data)
    )

    if response.status_code in [200, 204]:
        print("✅ Updated thing sent to Ditto successfully!")
    else:
        print(f"❌ Failed to update Ditto: {response.status_code}, {response.text}")


# ================= MQTT =================
client = mqtt.Client()
client.username_pw_set(USERNAME, PASSWORD)


def on_connect(client, userdata, flags, rc):
    print("✅ Connected with result code " + str(rc))
    client.subscribe(SUBSCRIBE_TOPIC)
    print(f"🔔 Subscribed to topic: {SUBSCRIBE_TOPIC}")


def on_message(client, userdata, msg):
    print("\n📩 Message received from Ditto:")

    payload = json.loads(msg.payload.decode())

    attributes = payload['value']['attributes']

    if "bins" not in attributes:
        return

    bins = attributes["bins"]

    # 🔥 CHECK if already processed (avoid infinite loop)
    already_processed = all(
        'result' in bin_data and bin_data['result'] != {}
        for bin_data in bins.values()
    )

    if already_processed:
        print("⏭️ Already processed, skipping...")
        return

    try:
        print("🤖 Processing data with smart bin pipeline...")

        # 🔥 USE SMART BIN PIPELINE
        dispatch, result_df, enriched_json = smart_bin_pipeline.process_json_fetch(payload['value'])

        # 🔥 PRINT DISPATCH RESULTS
        print("\n" + "="*60)
        print("🚀 DISPATCH RESULTS")
        print("="*60)
        print(json.dumps(dispatch, indent=2))

        # 🔥 UPDATE DITTO WITH ENRICHED JSON
        update_payload = {
            "attributes": enriched_json['attributes']
        }

        response = requests.put(
            "http://localhost:8080/api/2/things/org.Iotp2c:iwatch",
            auth=('ditto', 'ditto'),
            headers={"Content-Type": "application/json"},
            data=json.dumps(update_payload)
        )

        if response.status_code in [200, 204]:
            print("✅ Ditto updated with pipeline results")
        else:
            print(f"❌ Failed to update Ditto: {response.status_code}, {response.text}")

    except Exception as e:
        print(f"❌ Error: {e}")

def on_publish(client, userdata, mid):
    print(f"✅ Data published to {MQTT_TOPIC}")


def on_disconnect(client, userdata, rc):
    print("Disconnected from MQTT broker with result code " + str(rc))


client.on_connect = on_connect
client.on_message = on_message
client.on_publish = on_publish
client.on_disconnect = on_disconnect


# ================= SEND DATA =================
def send_data_to_ditto(iwatch_data):

    ditto_data = {
        "topic": "org.Iotp2c/iwatch/things/twin/commands/modify",
        "path": "/",
        "value": {
            "thingId": "org.Iotp2c:iwatch",
            "policyId": "org.Iotp2c:policy",
            "definition": "http://192.168.177.1:8000/iwatch.tm.jsonld",
            "attributes": {
                "bins": iwatch_data
            }    # 🔥 MULTI BIN HERE
        }
    }

    ditto_data_str = json.dumps(ditto_data)

    client.publish(MQTT_TOPIC, payload=ditto_data_str)

    print("📤 Data sent to Ditto:")
    print(json.dumps(ditto_data, indent=2))

    save_data_to_csv(iwatch_data)


# ================= MAIN =================
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_start()

simulator = iwatch_simulator.iwatch(num_bins=6)
INTERVAL = 10  # 🔥 change here (10 seconds)

try:
    while True:

        start_time = time.time()

        print("\n" + "="*40)
        print("🚀 NEW DATA CYCLE (6 bins)")
        print("="*40)

        # 🔥 generate NEW 6 bins
        iwatch_data = next(simulator) 

        # 🔥 send to Ditto
        send_data_to_ditto(iwatch_data)

        # 🔥 precise wait (keeps exact interval)
        elapsed = time.time() - start_time
        time.sleep(max(0, INTERVAL - elapsed))

except KeyboardInterrupt:
    print("⛔ Stopping...")
    client.loop_stop()
    client.disconnect()
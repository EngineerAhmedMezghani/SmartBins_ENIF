import numpy as np
from datetime import datetime

def iwatch(num_bins=6):

    base_lat = 36.8065
    base_lon = 10.1815

    # 🔥 INITIAL STATE (first random values)
    bins_state = {}

    for i in range(1, num_bins + 1):
        bin_id = f"BIN_{i:02d}"

        bins_state[bin_id] = {
            "fill_level": np.random.randint(10, 50),
            "gas_level": np.random.randint(100, 300),
            "temperature": np.random.uniform(20, 30),
            "humidity": np.random.uniform(40, 60),
            "weight": np.random.uniform(1, 5)
        }

    while True:

        timestamp = datetime.utcnow().isoformat(timespec='seconds') + "Z"
        bins_data = {}

        for i in range(1, num_bins + 1):

            bin_id = f"BIN_{i:02d}"

            state = bins_state[bin_id]

            # 🔥 INCREMENTAL UPDATE
            state["fill_level"] += np.random.randint(0, 5)
            state["gas_level"] += np.random.randint(-5, 10)
            state["temperature"] += np.random.uniform(-0.5, 0.5)
            state["humidity"] += np.random.uniform(-1, 1)
            state["weight"] += np.random.uniform(0, 2)

            # 🔥 LIMITS (important!)
            state["fill_level"] = min(100, max(0, state["fill_level"]))
            state["gas_level"] = max(0, state["gas_level"])
            state["temperature"] = round(state["temperature"], 2)
            state["humidity"] = min(100, max(0, state["humidity"]))
            state["weight"] = max(0, round(state["weight"], 2))

            # location slight variation
            latitude = base_lat + np.random.uniform(-0.001, 0.001)
            longitude = base_lon + np.random.uniform(-0.001, 0.001)

            bins_data[bin_id] = {
                "bin_id": bin_id,
                "timestamp": timestamp,
                "fill_level": state["fill_level"],
                "gas_level": state["gas_level"],
                "temperature": state["temperature"],
                "humidity": state["humidity"],
                "weight": state["weight"],
                "location": {
                    "latitude": latitude,
                    "longitude": longitude
                },
                "result": {}
            }

        yield bins_data
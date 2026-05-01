import requests
import time
import sys
import json

URL = "https://api2.warera.io/trpc/transaction.getPaginatedTransactions"

HEADERS = {
    "accept": "*/*",
    "X-API-KEY": "wae_da1597c373c9ac97d784e539f33f24c198f38429f56f366a4b7c92881eae4032",
    "Content-Type": "application/json"
}

TRANSACTION_TYPE = "openCase"
LIMIT = 100  # increase for efficiency

OUTPUT_FILE = "transactions.json"


def fetch_page(cursor):
    payload = {
        "limit": LIMIT,
        "transactionType": TRANSACTION_TYPE
    }

    if cursor:
        payload["cursor"] = cursor

    while True:
        try:
            res = requests.post(URL, headers=HEADERS, json=payload, timeout=10)

            if res.status_code == 200:
                return res.json()

            # Handle rate limit or server errors
            print(f"\nRetrying... status={res.status_code}")
            time.sleep(2)

        except Exception as e:
            print(f"\nError: {e}, retrying...")
            time.sleep(2)


def main():
    all_items = []
    cursor = None
    total = 0

    while True:
        data = fetch_page(cursor)

        try:
            result = data["result"]["data"]
            items = result["items"]
            next_cursor = result.get("nextCursor")
        except Exception:
            print("\nInvalid response, retrying same cursor...")
            time.sleep(2)
            continue

        if not items:
            break

        all_items.extend(items)
        total += len(items)

        # Progress print (same line)
        sys.stdout.write(f"\rFetched: {total}")
        sys.stdout.flush()

        if not next_cursor:
            break

        cursor = next_cursor

    print("\nDone. Saving...")

    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_items, f, indent=2)

    print(f"Saved {total} transactions to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

import json
from collections import defaultdict, Counter
from statistics import mean
from datetime import datetime

INPUT_FILE = "transactions.json"
OUTPUT_FILE = "../public/config/transactions_analysis.json"


def load_data():
    with open(INPUT_FILE, "r") as f:
        return json.load(f)


def safe_mean(values):
    return mean(values) if values else 0


def main():
    data = load_data()

    total_cases = 0

    cases_by_item_code = Counter()

    # UPDATED: now tracks per user + per case type
    cases_per_user = defaultdict(lambda: Counter())

    user_item_received = defaultdict(lambda: Counter())

    type_counts = Counter()
    code_counts = Counter()
    code_skills = defaultdict(lambda: defaultdict(list))

    # 🔥 NEW: case → item drop distribution
    case_drop_distribution = defaultdict(lambda: Counter())

    for tx in data:
        total_cases += 1

        item_code = tx.get("itemCode")
        cases_by_item_code[item_code] += 1

        user = tx.get("buyerId")

        # UPDATED structure
        cases_per_user[user][item_code] += 1

        item = tx.get("item", {})
        code = item.get("code")

        item_type = item.get("type", "weapon")
        type_counts[item_type] += 1

        code_counts[code] += 1
        user_item_received[user][code] += 1

        # skills aggregation
        skills = item.get("skills", {})
        for k, v in skills.items():
            code_skills[code][k].append(v)

        # 🔥 track drop distribution per case
        case_drop_distribution[item_code][code] += 1

    # average skill stats per code
    avg_skills_per_code = {}
    for code, skills_dict in code_skills.items():
        avg_skills_per_code[code] = {
            skill: safe_mean(values)
            for skill, values in skills_dict.items()
        }

    # normalize drop rates (probabilities)
    case_drop_rates = {}
    for case, items in case_drop_distribution.items():
        total = sum(items.values())
        case_drop_rates[case] = {
            code: count / total
            for code, count in items.items()
        }

    result = {
        "summary": {
            "total_cases_opened": total_cases,
            "cases_by_itemCode": dict(cases_by_item_code),
        },

        # UPDATED structure

        # "cases_per_user": {
        #     user: dict(cases)
        #     for user, cases in cases_per_user.items()
        # },

        # "user_item_breakdown": {
        #     user: dict(items)
        #     for user, items in user_item_received.items()
        # },

        "item_type_distribution": dict(type_counts),

        "item_code_distribution": dict(code_counts),

        "average_skills_per_code": avg_skills_per_code,

        "case_drop_rates": case_drop_rates
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(result, f, indent=2)

    print("Analysis saved to", OUTPUT_FILE)


if __name__ == "__main__":
    main()

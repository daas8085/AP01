import pandas as pd
import json
from pathlib import Path

# CONFIG
EXCEL_PATH = Path(r"C:\Users\pc\Desktop\AP01\order_sales.xlsx")
ORDER_SHEET = "ORDER BOOK"
SALES_SHEET = "SALES BOOK"
OUTPUT_JS  = Path(r"C:\Users\pc\Desktop\AP01\data-source.js")


def df_to_js_array(df):
    # Drop completely empty rows
    df = df.dropna(how="all")

    # Convert any date-like column to format → YYYY-MM-DD
    for col in df.columns:
        if "date" in col.lower():
            df[col] = (
                pd.to_datetime(df[col], errors="coerce")
                .dt.strftime("%Y-%m-%d")
            )

    # Replace NaN → empty strings
    df = df.fillna("")

    # Convert to list of dicts
    return json.dumps(df.to_dict(orient="records"), ensure_ascii=False, indent=4, default=str)


def main():
    order_df = pd.read_excel(EXCEL_PATH, sheet_name=ORDER_SHEET)
    sales_df = pd.read_excel(EXCEL_PATH, sheet_name=SALES_SHEET)

    # Rename keys to frontend usage
    order_df = order_df.rename(columns={
        "PO Number": "poNumber",
        "Job Name": "jobName",
        "Brand": "brand",
        "Order Qty": "orderQty",
        "Dispatch Qty": "dispQty",
        "Status": "status",
        "Login Date": "date",
        "Invoice No": "invoiceNo",
        "Value": "value",
        "Link" : "link"
    })

    sales_df = sales_df.rename(columns={
        "Date": "date",
        "Invoice No": "invoiceNo",
        "Value": "value",
        "Due Date": "dueDate",
        "link" : "link"
    })

    order_json = df_to_js_array(order_df)
    sales_json = df_to_js_array(sales_df)

    js_content = (
        "const orderBookData = " + order_json + ";\n\n"
        "const salesBookData = " + sales_json + ";\n"
    )

    OUTPUT_JS.write_text(js_content, encoding="utf-8")
    print(f"Wrote formatted data to: {OUTPUT_JS}")


if __name__ == "__main__":
    main()

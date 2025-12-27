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

    # Convert any date-like column to format → YYYY-Mon-DD  (example 2025-Dec-26)
    for col in df.columns:
        if "date" in col.lower():  # catches: date, loginDate, dueDate, invoiceDate etc.
            df[col] = (
                pd.to_datetime(df[col], errors="coerce")
                  .dt.strftime("%Y-%m-%d")   # <— UPDATED DATE FORMAT HERE
            )

    # Replace NaN -> empty strings
    df = df.fillna("")

    # Convert to Python list of dictionaries
    records = df.to_dict(orient="records")

    # JSON serialization, safe fallback with default=str
    return json.dumps(records, ensure_ascii=False, indent=4, default=str)


def main():
    # Read Excel sheets
    order_df = pd.read_excel(EXCEL_PATH, sheet_name=ORDER_SHEET)
    sales_df = pd.read_excel(EXCEL_PATH, sheet_name=SALES_SHEET)

    # Rename columns to match dashboard usage
    order_df = order_df.rename(columns={
        "PO Number": "poNumber",
        "Job Name": "jobName",
        "Brand": "brand",
        "Order Qty": "orderQty",
        "Dispatch Qty": "dispQty",
        "Status": "status",
        "Login Date": "loginDate",
        "Invoice No": "invoiceNo",
        "Value": "value"
    })

    sales_df = sales_df.rename(columns={
        "Date": "date",
        "Invoice No": "invoiceNo",
        "Value": "value",
        "Due Date": "dueDate"
    })

    # Convert to JSON with formatted dates
    order_json = df_to_js_array(order_df)
    sales_json = df_to_js_array(sales_df)

    # Generate JS file content
    js_content = (
        "const orderBookData = " + order_json + ";\n\n"
        "const salesBookData = " + sales_json + ";\n"
    )

    # Save output
    OUTPUT_JS.write_text(js_content, encoding="utf-8")
    print(f"✔ Wrote formatted dates to: {OUTPUT_JS}")


if __name__ == "__main__":
    main()

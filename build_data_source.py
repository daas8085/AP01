import pandas as pd
import json
from pathlib import Path

# CONFIG
EXCEL_PATH = Path(r"C:\Users\pc\Desktop\AP01\order_sales.xlsx")   # <‑ note r"..."
ORDER_SHEET = "ORDER BOOK"
SALES_SHEET = "SALES BOOK"
OUTPUT_JS  = Path(r"C:\Users\pc\Desktop\AP01\data-source.js")


def df_to_js_array(df):
    # Drop completely empty rows
    df = df.dropna(how="all")

    # Convert datetime / Timestamp columns to string
    for col in df.select_dtypes(include=["datetime64[ns]", "datetime64[ns, UTC]"]).columns:
        df[col] = df[col].dt.strftime("%Y-%m-%d")

    # Convert NaN -> "" so JSON is clean
    records = df.fillna("").to_dict(orient="records")
    return json.dumps(records, ensure_ascii=False, indent=4)
def main():
    # Read sheets
    order_df = pd.read_excel(EXCEL_PATH, sheet_name=ORDER_SHEET)
    sales_df = pd.read_excel(EXCEL_PATH, sheet_name=SALES_SHEET)

    # OPTIONAL: rename columns to match JS keys exactly
    # Example:
    # order_df = order_df.rename(columns={
    #     "PO Number": "poNumber",
    #     "Job Name": "jobName",
    #     "Brand": "brand",
    #     "Order Qty": "orderQty",
    #     "Dispatch Qty": "dispQty",
    #     "Status": "status",
    #     "Login Date": "loginDate",
    #     "Invoice No": "invoiceNo",
    #     "Value": "value"
    # })

    # sales_df = sales_df.rename(columns={
    #     "Date": "date",
    #     "Invoice No": "invoiceNo",
    #     "Value": "value",
    #     "Due Date": "dueDate"
    # })

    order_json = df_to_js_array(order_df)
    sales_json = df_to_js_array(sales_df)

    js_content = (
        "const orderBookData = " + order_json + ";\n\n"
        "const salesBookData = " + sales_json + ";\n"
    )

    OUTPUT_JS.write_text(js_content, encoding="utf-8")
    print(f"Wrote {OUTPUT_JS}")

if __name__ == "__main__":
    main()

---
name: Python Data Assistant
description: Data Architecture, Engineering, Science, Analytics, Visualization, และ Governance
---

# ผู้ช่วยด้านข้อมูล (Python Data Assistant)

คู่มือนี้ครอบคลุมทุกด้านของการทำงานกับข้อมูลโดยใช้ Python

## ภาพรวม

| ด้าน | คำอธิบาย | เครื่องมือหลัก |
|------|----------|---------------|
| **Data Architecture** | ออกแบบโครงสร้างข้อมูล | ERD, Data Modeling |
| **Data Engineering** | ETL/ELT Pipelines | Apache Airflow, Pandas |
| **Data Science** | ML/AI Models | Scikit-learn, PyTorch |
| **Data Analytics** | วิเคราะห์ข้อมูล | Pandas, SQL |
| **Data Visualization** | สร้างกราฟและ Dashboard | Matplotlib, Plotly |
| **Data Governance** | นโยบายและความปลอดภัย | Data Quality, Privacy |

---

## 1. Data Architecture

### การออกแบบ Schema

```python
# ERD สำหรับ HR-IMS
"""
┌──────────────────┐     ┌──────────────────┐
│      User        │     │  InventoryItem   │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ email            │     │ name             │
│ name             │     │ category         │
│ role             │     │ type             │
│ department       │     │ stock            │
└──────────────────┘     └──────────────────┘
         │                        │
         │                        │
         ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│     Request      │     │   StockLevel     │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ warehouseId (FK) │
│ userId (FK)      │     │ itemId (FK)      │
│ status           │     │ quantity         │
│ type             │     │ minStock         │
└──────────────────┘     └──────────────────┘
"""
```

### Data Modeling Libraries

```python
# SQLAlchemy ORM
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    role = Column(String, default='user')
    
    requests = relationship('Request', back_populates='user')

class InventoryItem(Base):
    __tablename__ = 'inventory_items'
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String)
    type = Column(String)  # durable, consumable
    stock = Column(Integer, default=0)
```

---

## 2. Data Engineering

### ETL Pipeline ด้วย Pandas

```python
import pandas as pd
from datetime import datetime

def extract(source_path: str) -> pd.DataFrame:
    """ดึงข้อมูลจากแหล่งที่มา"""
    if source_path.endswith('.csv'):
        return pd.read_csv(source_path)
    elif source_path.endswith('.xlsx'):
        return pd.read_excel(source_path)
    elif source_path.endswith('.json'):
        return pd.read_json(source_path)
    else:
        raise ValueError(f"Unsupported format: {source_path}")

def transform(df: pd.DataFrame) -> pd.DataFrame:
    """แปลงและทำความสะอาดข้อมูล"""
    # ลบ duplicates
    df = df.drop_duplicates()
    
    # แปลงวันที่
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'])
    
    # ทำความสะอาด string
    if 'name' in df.columns:
        df['name'] = df['name'].str.strip().str.title()
    
    # จัดการ missing values
    df = df.fillna({
        'stock': 0,
        'category': 'Uncategorized'
    })
    
    return df

def load(df: pd.DataFrame, dest_path: str):
    """บันทึกข้อมูลไปยังปลายทาง"""
    if dest_path.endswith('.csv'):
        df.to_csv(dest_path, index=False)
    elif dest_path.endswith('.parquet'):
        df.to_parquet(dest_path, index=False)
    print(f"Loaded {len(df)} rows to {dest_path}")

# Pipeline execution
def run_etl(source: str, destination: str):
    df = extract(source)
    df = transform(df)
    load(df, destination)
    return df
```

### Apache Airflow DAG

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'email_on_failure': True,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'hrims_daily_etl',
    default_args=default_args,
    description='Daily ETL for HR-IMS',
    schedule_interval='0 2 * * *',  # ทุกวัน 2 โมงเช้า
    start_date=datetime(2024, 1, 1),
    catchup=False,
) as dag:

    extract_task = PythonOperator(
        task_id='extract_data',
        python_callable=extract,
        op_kwargs={'source_path': '/data/raw/inventory.csv'},
    )

    transform_task = PythonOperator(
        task_id='transform_data',
        python_callable=transform,
    )

    load_task = PythonOperator(
        task_id='load_data',
        python_callable=load,
        op_kwargs={'dest_path': '/data/processed/inventory.parquet'},
    )

    extract_task >> transform_task >> load_task
```

---

## 3. Data Science

### Machine Learning Pipeline

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# โหลดข้อมูล
df = pd.read_csv('requests.csv')

# Feature Engineering
df['request_month'] = pd.to_datetime(df['created_at']).dt.month
df['request_day'] = pd.to_datetime(df['created_at']).dt.day_of_week

# Encode categorical variables
le = LabelEncoder()
df['category_encoded'] = le.fit_transform(df['category'])

# Features และ Target
X = df[['category_encoded', 'quantity', 'request_month', 'request_day']]
y = df['status'].map({'approved': 1, 'rejected': 0})

# Train/Test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train_scaled, y_train)

# Evaluate
y_pred = model.predict(X_test_scaled)
print(f"Accuracy: {accuracy_score(y_test, y_pred):.2f}")
print(classification_report(y_test, y_pred))

# Save model
joblib.dump(model, 'request_approval_model.pkl')
joblib.dump(scaler, 'scaler.pkl')
```

### การทำนาย

```python
import joblib

def predict_approval(category: str, quantity: int, month: int, day: int) -> dict:
    """ทำนายโอกาสอนุมัติคำขอ"""
    model = joblib.load('request_approval_model.pkl')
    scaler = joblib.load('scaler.pkl')
    le = joblib.load('label_encoder.pkl')
    
    # Prepare input
    category_encoded = le.transform([category])[0]
    features = [[category_encoded, quantity, month, day]]
    features_scaled = scaler.transform(features)
    
    # Predict
    prediction = model.predict(features_scaled)[0]
    probability = model.predict_proba(features_scaled)[0]
    
    return {
        'prediction': 'approved' if prediction == 1 else 'rejected',
        'confidence': max(probability) * 100
    }
```

---

## 4. Data Analytics

### การวิเคราะห์ด้วย Pandas

```python
import pandas as pd

# โหลดข้อมูล
df = pd.read_csv('inventory_transactions.csv')

# สรุปสถิติพื้นฐาน
print(df.describe())

# นับจำนวนตามหมวดหมู่
category_counts = df.groupby('category').agg({
    'quantity': 'sum',
    'id': 'count'
}).rename(columns={'id': 'transactions'})
print(category_counts)

# วิเคราะห์แนวโน้มรายเดือน
df['month'] = pd.to_datetime(df['date']).dt.to_period('M')
monthly_trend = df.groupby('month')['quantity'].sum()
print(monthly_trend)

# Top 10 สินค้าที่เบิกมากที่สุด
top_items = df.groupby('item_name')['quantity'].sum().nlargest(10)
print(top_items)

# หาสินค้าที่ stock ต่ำกว่า reorder level
low_stock = df[df['stock'] < df['min_stock']]
print(f"สินค้าที่ต้องสั่งซื้อ: {len(low_stock)} รายการ")
```

### SQL Analytics

```python
import sqlite3
import pandas as pd

conn = sqlite3.connect('hrims.db')

# Query ด้วย SQL
query = """
SELECT 
    category,
    COUNT(*) as item_count,
    SUM(stock) as total_stock,
    AVG(stock) as avg_stock
FROM inventory_items
GROUP BY category
ORDER BY total_stock DESC
"""

df = pd.read_sql(query, conn)
print(df)

conn.close()
```

---

## 5. Data Visualization

### Matplotlib

```python
import matplotlib.pyplot as plt
import pandas as pd

df = pd.read_csv('inventory.csv')

# Bar Chart
fig, ax = plt.subplots(figsize=(10, 6))
category_counts = df.groupby('category')['stock'].sum()
category_counts.plot(kind='bar', ax=ax, color='steelblue')
ax.set_title('สินค้าคงคลังตามหมวดหมู่', fontsize=14)
ax.set_xlabel('หมวดหมู่')
ax.set_ylabel('จำนวน')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig('inventory_by_category.png', dpi=300)
plt.show()
```

### Plotly (Interactive)

```python
import plotly.express as px
import pandas as pd

df = pd.read_csv('requests.csv')

# Interactive Bar Chart
fig = px.bar(
    df.groupby('status').size().reset_index(name='count'),
    x='status',
    y='count',
    color='status',
    title='สถานะคำขอ'
)
fig.write_html('request_status.html')

# Pie Chart
fig = px.pie(
    df,
    names='category',
    values='quantity',
    title='สัดส่วนการเบิกตามหมวดหมู่'
)
fig.show()

# Time Series
df['date'] = pd.to_datetime(df['created_at'])
daily = df.groupby(df['date'].dt.date).size().reset_index(name='count')
fig = px.line(daily, x='date', y='count', title='คำขอรายวัน')
fig.show()
```

### Dashboard ด้วย Streamlit

```python
# app.py
import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="HR-IMS Dashboard", layout="wide")

st.title("🏭 HR-IMS Dashboard")

# Sidebar filters
st.sidebar.header("Filters")
category = st.sidebar.multiselect("หมวดหมู่", ['Electronics', 'Office', 'Supplies'])

# Load data
df = pd.read_csv('inventory.csv')
if category:
    df = df[df['category'].isin(category)]

# Metrics
col1, col2, col3 = st.columns(3)
col1.metric("สินค้าทั้งหมด", len(df))
col2.metric("สินค้าคงคลัง", df['stock'].sum())
col3.metric("สินค้าต่ำกว่า Min", len(df[df['stock'] < df['min_stock']]))

# Charts
st.subheader("📊 สินค้าตามหมวดหมู่")
fig = px.bar(df.groupby('category')['stock'].sum().reset_index(),
             x='category', y='stock')
st.plotly_chart(fig, use_container_width=True)

# Data Table
st.subheader("📋 รายการสินค้า")
st.dataframe(df, use_container_width=True)
```

```bash
# รัน Dashboard
streamlit run app.py
```

---

## 6. Data Governance

### Data Quality Checks

```python
import pandas as pd
from typing import Dict, List

def check_data_quality(df: pd.DataFrame) -> Dict[str, any]:
    """ตรวจสอบคุณภาพข้อมูล"""
    report = {
        'total_rows': len(df),
        'total_columns': len(df.columns),
        'missing_values': df.isnull().sum().to_dict(),
        'duplicates': df.duplicated().sum(),
        'data_types': df.dtypes.astype(str).to_dict(),
    }
    
    # Check for anomalies
    numeric_cols = df.select_dtypes(include=['number']).columns
    for col in numeric_cols:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        outliers = ((df[col] < (q1 - 1.5 * iqr)) | (df[col] > (q3 + 1.5 * iqr))).sum()
        report[f'{col}_outliers'] = outliers
    
    return report

def validate_schema(df: pd.DataFrame, expected_schema: Dict[str, str]) -> List[str]:
    """ตรวจสอบ Schema"""
    errors = []
    for col, dtype in expected_schema.items():
        if col not in df.columns:
            errors.append(f"Missing column: {col}")
        elif str(df[col].dtype) != dtype:
            errors.append(f"Wrong dtype for {col}: expected {dtype}, got {df[col].dtype}")
    return errors

# ใช้งาน
expected = {
    'id': 'int64',
    'name': 'object',
    'stock': 'int64',
}

df = pd.read_csv('inventory.csv')
quality_report = check_data_quality(df)
schema_errors = validate_schema(df, expected)

print("Quality Report:", quality_report)
print("Schema Errors:", schema_errors)
```

### Data Privacy (PII Masking)

```python
import re
import hashlib

def mask_email(email: str) -> str:
    """ซ่อนอีเมล: john@example.com -> j***@example.com"""
    if '@' not in email:
        return email
    local, domain = email.split('@')
    return f"{local[0]}{'*' * (len(local)-1)}@{domain}"

def mask_phone(phone: str) -> str:
    """ซ่อนเบอร์โทร: 0812345678 -> 081***5678"""
    digits = re.sub(r'\D', '', phone)
    if len(digits) >= 10:
        return f"{digits[:3]}***{digits[-4:]}"
    return phone

def hash_pii(value: str) -> str:
    """Hash ข้อมูลส่วนบุคคล"""
    return hashlib.sha256(value.encode()).hexdigest()[:16]

# ใช้งาน
df['email_masked'] = df['email'].apply(mask_email)
df['phone_masked'] = df['phone'].apply(mask_phone)
df['id_hashed'] = df['national_id'].apply(hash_pii)
```

---

## การติดตั้ง

```bash
# Data Engineering
pip install pandas numpy sqlalchemy apache-airflow

# Data Science
pip install scikit-learn joblib tensorflow torch

# Data Visualization
pip install matplotlib seaborn plotly streamlit

# Data Quality
pip install great_expectations pandera
```

---

## แนวปฏิบัติที่ดีที่สุด

1. ✅ ใช้ Virtual Environment สำหรับทุกโปรเจค
2. ✅ เขียน Docstrings และ Type Hints
3. ✅ ทดสอบ Data Quality ก่อน Load
4. ✅ Version Control สำหรับ Models
5. ✅ Log ทุก Pipeline Execution
6. ✅ ปกป้องข้อมูลส่วนบุคคล (PII)
7. ❌ อย่าเก็บข้อมูลลับใน Code
8. ❌ อย่า Hardcode Credentials

---

## อ้างอิงอย่างรวดเร็ว

| Library | ใช้สำหรับ |
|---------|----------|
| Pandas | Data manipulation |
| NumPy | Numerical computing |
| Scikit-learn | Machine Learning |
| Matplotlib | Static plots |
| Plotly | Interactive plots |
| Streamlit | Dashboards |
| Airflow | Workflow orchestration |
| Great Expectations | Data validation |

import sqlite3
import os
import pandas as pd

pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)

QUERIES = os.listdir('sql')

results = {}

for query_file in QUERIES:
    with open('sql//'+query_file,encoding='utf-8') as f:
        sql_query = f.read()
    with sqlite3.connect('scores.db') as conn:
        df = pd.read_sql_query(sql_query, conn)
    results.update({query_file : df})
    print(query_file,'\n', df)


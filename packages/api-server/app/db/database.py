# packages/api-server/app/config/firebase_config.py

# Firebase Admin SDKのコアモジュールをインポートします。
import firebase_admin
# サービスアカウント認証情報を使用するためのモジュールをインポートします。
from firebase_admin import credentials
# Realtime Databaseにアクセスするためのモジュールをインポートします。
from firebase_admin import db
# オペレーティングシステム関連の機能（環境変数の読み込みなど）を扱うためのモジュールをインポートします。
import os
# JSONデータを扱うためのモジュールをインポートします。
import json
# .envファイルから環境変数をロードするためのライブラリをインポートします。
from dotenv import load_dotenv

# .envファイルから環境変数をロードします。
# os.path.dirname(os.path.abspath(__file__)) は現在のファイルのディレクトリパスを取得し、
# そこから '..' を2回上がってプロジェクトのルートディレクトリにある.envファイルを指定しています。
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '.env'))

# 環境変数からFirebaseサービスアカウントキーのJSON文字列を取得します。
# このキーは、Firebaseプロジェクトへのアクセスを認証するために使用されます。
firebase_service_account_key_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
# 環境変数からFirebase Realtime DatabaseのURLを取得します。
firebase_database_url = os.getenv("FIREBASE_DATABASE_URL")

# firebase_service_account_key_json が設定されていない場合、エラーを発生させます。
# これは、アプリケーションがFirebaseに接続するために必要な情報がないことを意味します。
if not firebase_service_account_key_json:
    raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set.")

# firebase_database_url が設定されていない場合、エラーを発生させます。
# これは、接続するデータベースのURLが指定されていないことを意味します。
if not firebase_database_url:
    raise ValueError("FIREBASE_DATABASE_URL environment variable not set.")

try:
    # 取得したJSON文字列をPythonの辞書にパース（解析）します。
    service_account_info = json.loads(firebase_service_account_key_json)
except json.JSONDecodeError:
    # JSONのパースに失敗した場合、エラーを発生させます。
    # 環境変数の値が正しいJSON形式ではないことを示します。
    raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY is not a valid JSON string.")

# パースしたサービスアカウント情報を使用して、Firebaseの認証情報を生成します。
cred = credentials.Certificate(service_account_info)

# Firebase Admin SDKを初期化します。
# `firebase_admin._apps` をチェックして、すでに初期化されている場合はスキップします。
# これにより、同じアプリケーションが複数回初期化されるのを防ぎます。
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {
        'databaseURL': firebase_database_url # データベースURLを指定して初期化します。
    })

# Firebase Realtime Databaseの参照を返す関数です。
# 他のモジュールからこの関数を呼び出すことで、データベースにアクセスできます。
def get_db():
    return db

# --- Deck CRUD Operations ---

def get_deck_from_db(client_id: str, deck_id: str):
    """指定されたクライアントIDとデッキIDに基づいて、データベースから特定のデッキを取得します。"""
    if not client_id or not deck_id:
        return None
    ref = db.reference(f'users/{client_id}/decks/{deck_id}')
    return ref.get()

def get_decks_by_client_id_from_db(client_id: str):
    """指定されたクライアントIDに基づいて、そのユーザーのすべてのデッキをデータベースから取得します。"""
    if not client_id:
        return None
    ref = db.reference(f'users/{client_id}/decks')
    return ref.get()

def create_deck_in_db(client_id: str, deck_data: dict):
    """新しいデッキをデータベースに作成します。"""
    if not client_id:
        raise ValueError("Client ID is required to create a deck.")
    ref = db.reference(f'users/{client_id}/decks')
    new_deck_ref = ref.push(deck_data)
    deck_id = new_deck_ref.key
    
    # 作成したデッキデータに、Firebaseが自動生成したユニークなIDを追加して更新します。
    update_data = {'id': deck_id}
    new_deck_ref.update(update_data)
    
    # 完全なデッキデータを返すために、元のデータにIDを追加します。
    deck_data['id'] = deck_id
    return deck_data

def update_deck_in_db(client_id: str, deck_id: str, deck_data: dict):
    """既存のデッキをデータベースで更新します。"""
    if not client_id or not deck_id:
        raise ValueError("Client ID and Deck ID are required to update a deck.")
    ref = db.reference(f'users/{client_id}/decks/{deck_id}')
    ref.update(deck_data)
    # 更新後の完全なデータを返すために、IDをマージします。
    return {**deck_data, 'id': deck_id}

def delete_deck_from_db(client_id: str, deck_id: str):
    """データベースから特定のデッキを削除します。"""
    if not client_id or not deck_id:
        raise ValueError("Client ID and Deck ID are required to delete a deck.")
    ref = db.reference(f'users/{client_id}/decks/{deck_id}')
    ref.delete()
    # 削除が成功したことを示すために、削除したデッキのIDを返します。
    return {'id': deck_id}

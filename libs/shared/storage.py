import os
import logging
import tempfile
from typing import Any
from io import BytesIO
from pathlib import Path
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

logger = logging.getLogger("storage")

class MinioStorage:
    """Enterprise S3-compatible client wrapper for MinIO storage, with transparent Azure Blob Storage fallback."""
    
    _s3_client = None
    _azure_blob_service_client = None
    BUCKET_NAME = "claimgpt"

    @classmethod
    def is_azure_configured(cls) -> bool:
        """Check if Azure Storage is configured."""
        return bool(os.getenv("AZURE_STORAGE_ACCOUNT_URL") or os.getenv("AZURE_STORAGE_CONNECTION_STRING"))

    @classmethod
    def get_azure_client(cls) -> Any:
        """Initialize and return a single-instance Azure BlobServiceClient."""
        if cls._azure_blob_service_client is None:
            connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
            account_url = os.getenv("AZURE_STORAGE_ACCOUNT_URL")
            
            if not connection_string and not account_url:
                raise ValueError("Neither AZURE_STORAGE_CONNECTION_STRING nor AZURE_STORAGE_ACCOUNT_URL is configured.")
            
            try:
                from azure.storage.blob import BlobServiceClient
                
                if connection_string:
                    cls._azure_blob_service_client = BlobServiceClient.from_connection_string(connection_string)
                    logger.info("[AZURE STORAGE] Initialized BlobServiceClient using Connection String.")
                else:
                    from azure.identity import DefaultAzureCredential
                    # DefaultAzureCredential automatically handles local az login, env credentials, and managed identity
                    credential = DefaultAzureCredential()
                    cls._azure_blob_service_client = BlobServiceClient(account_url=account_url, credential=credential)
                    logger.info("[AZURE STORAGE] Initialized BlobServiceClient using DefaultAzureCredential.")
                
                # Ensure container exists
                container_client = cls._azure_blob_service_client.get_container_client(cls.BUCKET_NAME)
                if not container_client.exists():
                    container_client.create_container()
                    logger.info("[AZURE STORAGE] Created container '%s' successfully.", cls.BUCKET_NAME)
            except Exception as e:
                logger.exception("[AZURE STORAGE] Failed to initialize Azure Blob Storage client: %s", e)
                raise
        return cls._azure_blob_service_client

    @classmethod
    def get_s3_client(cls) -> Any:
        """Initialize and return a single-instance boto3 S3 client for MinIO."""
        if cls._s3_client is None:
            endpoint = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
            access_key = os.getenv("MINIO_ROOT_USER", "claimgpt")
            secret_key = os.getenv("MINIO_ROOT_PASSWORD", "claimgpt123")
            
            cls._s3_client = boto3.client(
                "s3",
                endpoint_url=endpoint,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=Config(
                    signature_version="s3v4",
                    connect_timeout=5,
                    read_timeout=15,
                    retries={"max_attempts": 3}
                )
            )
            cls.ensure_bucket_exists()
        return cls._s3_client

    @classmethod
    def get_client(cls) -> Any:
        """Return the active storage client instance based on configuration."""
        if cls.is_azure_configured():
            return cls.get_azure_client()
        return cls.get_s3_client()

    @classmethod
    def ensure_bucket_exists(cls) -> None:
        """Verify that our primary bucket exists in MinIO."""
        client = boto3.client(
            "s3",
            endpoint_url=os.getenv("MINIO_ENDPOINT", "http://minio:9000"),
            aws_access_key_id=os.getenv("MINIO_ROOT_USER", "claimgpt"),
            aws_secret_access_key=os.getenv("MINIO_ROOT_PASSWORD", "claimgpt123"),
            config=Config(signature_version="s3v4")
        )
        try:
            client.head_bucket(Bucket=cls.BUCKET_NAME)
            logger.info(f"[MINIO] Bucket '{cls.BUCKET_NAME}' already exists.")
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code in ("404", "NoSuchBucket"):
                try:
                    client.create_bucket(Bucket=cls.BUCKET_NAME)
                    logger.info(f"[MINIO] Created bucket '{cls.BUCKET_NAME}' successfully.")
                except Exception as ex:
                    logger.error(f"[MINIO] Failed to create bucket '{cls.BUCKET_NAME}': {ex}")
            else:
                logger.error(f"[MINIO] Error checking bucket '{cls.BUCKET_NAME}': {e}")

    @classmethod
    def upload_file(cls, minio_key: str, file_path_or_bytes: Any) -> str:
        """Upload a file or raw bytes to active storage backend and return its storage URI."""
        if cls.is_azure_configured():
            service_client = cls.get_azure_client()
            try:
                blob_client = service_client.get_blob_client(container=cls.BUCKET_NAME, blob=minio_key)
                if isinstance(file_path_or_bytes, bytes):
                    blob_client.upload_blob(file_path_or_bytes, overwrite=True)
                else:
                    with open(file_path_or_bytes, "rb") as data:
                        blob_client.upload_blob(data, overwrite=True)
                storage_uri = f"s3://{cls.BUCKET_NAME}/{minio_key}"
                logger.info(f"[AZURE STORAGE] Successfully uploaded to: {storage_uri}")
                return storage_uri
            except Exception as e:
                logger.exception(f"[AZURE STORAGE] Failed to upload blob '{minio_key}': {e}")
                raise
        else:
            client = cls.get_s3_client()
            try:
                if isinstance(file_path_or_bytes, bytes):
                    client.upload_fileobj(
                        BytesIO(file_path_or_bytes),
                        cls.BUCKET_NAME,
                        minio_key
                    )
                else:
                    client.upload_file(
                        str(file_path_or_bytes),
                        cls.BUCKET_NAME,
                        minio_key
                    )
                minio_uri = f"s3://{cls.BUCKET_NAME}/{minio_key}"
                logger.info(f"[MINIO] Successfully uploaded to: {minio_uri}")
                return minio_uri
            except Exception as e:
                logger.exception(f"[MINIO] Failed to upload object '{minio_key}': {e}")
                raise

    @classmethod
    def download_file(cls, minio_uri: str, local_dest_path: str) -> None:
        """Download an object from storage backend using its URI to a local destination."""
        if not minio_uri.startswith("s3://"):
            raise ValueError(f"Invalid storage URI: {minio_uri}")
        
        path_parts = minio_uri[5:].split("/", 1)
        bucket = path_parts[0]
        minio_key = path_parts[1]

        if cls.is_azure_configured():
            service_client = cls.get_azure_client()
            try:
                blob_client = service_client.get_blob_client(container=bucket, blob=minio_key)
                with open(local_dest_path, "wb") as f:
                    download_stream = blob_client.download_blob()
                    f.write(download_stream.readall())
                logger.info(f"[AZURE STORAGE] Successfully downloaded {minio_uri} -> {local_dest_path}")
            except Exception as e:
                logger.exception(f"[AZURE STORAGE] Failed to download blob '{minio_uri}': {e}")
                raise
        else:
            client = cls.get_s3_client()
            try:
                client.download_file(bucket, minio_key, str(local_dest_path))
                logger.info(f"[MINIO] Successfully downloaded {minio_uri} -> {local_dest_path}")
            except Exception as e:
                logger.exception(f"[MINIO] Failed to download object '{minio_uri}': {e}")
                raise

    @classmethod
    def download_to_temp(cls, minio_uri: str) -> str:
        """Download an object from storage backend to a temporary file and return its path.
        
        CRITICAL: The caller is responsible for deleting the temp file after use!
        """
        if not minio_uri.startswith("s3://"):
            raise ValueError(f"Invalid storage URI: {minio_uri}")
        
        path_parts = minio_uri[5:].split("/", 1)
        bucket = path_parts[0]
        minio_key = path_parts[1]
        
        # Preserve file extension
        suffix = os.path.splitext(minio_key)[1] or ".bin"
        
        # Create a secure temp file (not closed/deleted automatically so caller can read it)
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        temp_path = temp_file.name
        temp_file.close()

        if cls.is_azure_configured():
            service_client = cls.get_azure_client()
            try:
                blob_client = service_client.get_blob_client(container=bucket, blob=minio_key)
                with open(temp_path, "wb") as f:
                    download_stream = blob_client.download_blob()
                    f.write(download_stream.readall())
                logger.info(f"[AZURE STORAGE] Downloaded to temporary file: {temp_path}")
                return temp_path
            except Exception as e:
                logger.exception(f"[AZURE STORAGE] Failed to download blob to temp '{minio_uri}': {e}")
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
                raise
        else:
            client = cls.get_s3_client()
            try:
                client.download_file(bucket, minio_key, temp_path)
                logger.info(f"[MINIO] Downloaded to temporary file: {temp_path}")
                return temp_path
            except Exception as e:
                logger.exception(f"[MINIO] Failed to download object to temp '{minio_uri}': {e}")
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
                raise

    @classmethod
    def delete_file(cls, minio_uri: str) -> None:
        """Delete an object from active storage using its URI or local path fallback."""
        if not minio_uri:
            return
        # If it's a local file path (fallback), delete it from filesystem
        if not minio_uri.startswith("s3://"):
            try:
                if os.path.exists(minio_uri):
                    os.remove(minio_uri)
                    logger.info(f"[STORAGE] Deleted local file: {minio_uri}")
            except Exception as e:
                logger.error(f"[STORAGE] Failed to delete local file {minio_uri}: {e}")
            return

        path_parts = minio_uri[5:].split("/", 1)
        bucket = path_parts[0]
        minio_key = path_parts[1]

        if cls.is_azure_configured():
            service_client = cls.get_azure_client()
            try:
                blob_client = service_client.get_blob_client(container=bucket, blob=minio_key)
                blob_client.delete_blob()
                logger.info(f"[AZURE STORAGE] Successfully deleted blob: {minio_uri}")
            except Exception as e:
                logger.exception(f"[AZURE STORAGE] Failed to delete blob '{minio_uri}': {e}")
                raise
        else:
            client = cls.get_s3_client()
            try:
                client.delete_object(Bucket=bucket, Key=minio_key)
                logger.info(f"[MINIO] Successfully deleted object: {minio_uri}")
            except Exception as e:
                logger.exception(f"[MINIO] Failed to delete object '{minio_uri}': {e}")
                raise

    @classmethod
    def copy_file(cls, src_minio_uri: str, dest_minio_key: str) -> str:
        """Copy an object from one storage key to another and return the new URI."""
        if not src_minio_uri.startswith("s3://"):
            raise ValueError(f"Invalid source storage URI: {src_minio_uri}")
        
        path_parts = src_minio_uri[5:].split("/", 1)
        src_bucket = path_parts[0]
        src_key = path_parts[1]

        if cls.is_azure_configured():
            service_client = cls.get_azure_client()
            try:
                source_blob = f"https://{service_client.account_name}.blob.core.windows.net/{src_bucket}/{src_key}"
                dest_blob_client = service_client.get_blob_client(container=cls.BUCKET_NAME, blob=dest_minio_key)
                
                # Start copying from URL
                dest_blob_client.start_copy_from_url(source_blob)
                dest_uri = f"s3://{cls.BUCKET_NAME}/{dest_minio_key}"
                logger.info(f"[AZURE STORAGE] Successfully copied {src_minio_uri} -> {dest_uri}")
                return dest_uri
            except Exception as e:
                logger.exception(f"[AZURE STORAGE] Failed to copy blob from '{src_minio_uri}' to '{dest_minio_key}': {e}")
                raise
        else:
            client = cls.get_s3_client()
            try:
                copy_source = {
                    'Bucket': src_bucket,
                    'Key': src_key
                }
                client.copy(copy_source, cls.BUCKET_NAME, dest_minio_key)
                dest_uri = f"s3://{cls.BUCKET_NAME}/{dest_minio_key}"
                logger.info(f"[MINIO] Successfully copied {src_minio_uri} -> {dest_uri}")
                return dest_uri
            except Exception as e:
                logger.exception(f"[MINIO] Failed to copy object from '{src_minio_uri}' to '{dest_minio_key}': {e}")
                raise

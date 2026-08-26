import os
import sys
import logging
from dotenv import load_dotenv

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("test_storage")

# Load environment
load_dotenv()

# Verify that AZURE_STORAGE_ACCOUNT_URL is configured
azure_url = os.getenv("AZURE_STORAGE_ACCOUNT_URL")
if not azure_url:
    logger.error("❌ AZURE_STORAGE_ACCOUNT_URL is not set in .env! Please add it first.")
    sys.exit(1)

logger.info(f"Using Azure Storage URL: {azure_url}")

try:
    from libs.shared.storage import MinioStorage
    
    # 1. Assert Azure mode is active
    if not MinioStorage.is_azure_configured():
        logger.error("❌ MinioStorage did not detect AZURE_STORAGE_ACCOUNT_URL!")
        sys.exit(1)
    logger.info("✅ MinioStorage correctly detected Azure configuration.")

    # 2. Test File Upload (Bytes)
    test_key = "test_azure_upload_verification.txt"
    test_data = b"ClaimGPT Azure Blob Storage connection test: Success!"
    logger.info(f"Uploading test bytes to key: {test_key}...")
    
    storage_uri = MinioStorage.upload_file(test_key, test_data)
    logger.info(f"✅ Upload succeeded. Storage URI: {storage_uri}")

    # 3. Test File Download
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as tmp:
        temp_dest = tmp.name
    
    logger.info(f"Downloading back to temporary destination: {temp_dest}...")
    MinioStorage.download_file(storage_uri, temp_dest)
    
    with open(temp_dest, "rb") as f:
        downloaded_content = f.read()
    
    # Clean up temp file
    try:
        os.remove(temp_dest)
    except OSError:
        pass

    logger.info(f"Downloaded content: {downloaded_content.decode('utf-8')}")
    if downloaded_content == test_data:
        logger.info("✅ Content verification succeeded! Uploaded data matches downloaded data.")
    else:
        logger.error("❌ Content mismatch! Downloaded data does not match uploaded data.")
        sys.exit(1)

    # 4. Test File Deletion
    logger.info(f"Deleting test object: {storage_uri}...")
    MinioStorage.delete_file(storage_uri)
    logger.info("✅ Deletion completed.")
    
    logger.info("🎉 ALL TESTS PASSED! Azure Blob Storage connection is 100% functional.")

except Exception as e:
    logger.exception(f"❌ Storage test failed with exception: {e}")
    sys.exit(1)

import boto3
import uuid
from fastapi import UploadFile

# --- S3 Configuration ---
# It is recommended to read these values from environment variables
S3_ENDPOINT_URL = "https://objstorage.leapcell.io"
S3_ACCESS_KEY_ID = "87c3bad6303643cd85133c3ac5ff4ed0"
S3_SECRET_ACCESS_KEY = "8aab2ff0c4d7974f4d55a8043f79bdb65bed5b0c823133eb8f4bf42a60be005a"
S3_BUCKET_NAME = "dnstrg-wrhq-pix5-r5hremw2"
S3_PUBLIC_URL = f"https://{S3_BUCKET_NAME}.leapcellobj.com"

# Initialize S3 client
s3_client = boto3.client(
    "s3",
    endpoint_url=S3_ENDPOINT_URL,
    aws_access_key_id=S3_ACCESS_KEY_ID,
    aws_secret_access_key=S3_SECRET_ACCESS_KEY,
    region_name="us-east-1", # For S3-compatible storage, the region is often nominal
)

def upload_file_to_s3(file: UploadFile) -> str:
    """
    Uploads a file to S3 and returns its public URL.
    """
    try:
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"

        s3_client.upload_fileobj(
            file.file,
            S3_BUCKET_NAME,
            unique_filename,
            ExtraArgs={
                "ContentType": file.content_type,
                "ACL": "public-read",
            },
        )

        # Return the public URL of the file
        return f"{S3_PUBLIC_URL}/{unique_filename}"
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        raise

def delete_file_from_s3(image_url: str) -> bool:
    """
    Deletes a file from S3 by its public URL.
    Returns True if successful, False otherwise.
    """
    try:
        # Extract filename from URL
        # URL format: https://{bucket}.leapcellobj.com/{filename}
        filename = image_url.split("/")[-1]
        
        s3_client.delete_object(
            Bucket=S3_BUCKET_NAME,
            Key=filename
        )
        return True
    except Exception as e:
        print(f"Error deleting from S3: {e}")
        return False
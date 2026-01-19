import boto3
import uuid
from fastapi import UploadFile
from core.config import settings

# --- S3 Configuration ---


# Initialize S3 client
s3_client = boto3.client(
    "s3",
    endpoint_url=settings.S3_ENDPOINT_URL,
    aws_access_key_id=settings.S3_ACCESS_KEY_ID,
    aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
    region_name=settings.S3_REGION, # For S3-compatible storage, the region is often nominal
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
            settings.S3_BUCKET_NAME,
            unique_filename,
            ExtraArgs={
                "ContentType": file.content_type,
                "ACL": "public-read",
            },
        )

        # Return the public URL of the file
        return f"{settings.S3_PUBLIC_URL}/{unique_filename}"
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        raise

def delete_file_from_s3(image_url: str) -> bool:
    """
    Deletes a file from S3 by its public URL.
    Returns True if successful, False otherwise.
    """
    try:
        # URL format: https://3mwvmd.leapcellobj.com/{S3_BUCKET_NAME}/{filename}
        filename = image_url.split("/")[-1]
        
        s3_client.delete_objects(
            Bucket=settings.S3_BUCKET_NAME,
            Delete={"Objects": [{"Key": filename}]}
        )
        return True
    except Exception as e:
        print(f"Error deleting from S3: {e}", filename)
        return False
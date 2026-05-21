# Bedrock model references:
#
# LLM (inference):
#   global.anthropic.claude-sonnet-4-5-20250929-v1:0
#   Global cross-region inference profile — callable from ap-south-1
#
# Embeddings:
#   amazon.titan-embed-text-v2:0
#   In-region model — available in ap-south-1
#
# Both models are invoked from the EC2 instance using the IAM role in iam.tf.
# BEDROCK_REGION is set to var.aws_region (ap-south-1) in the environment file.

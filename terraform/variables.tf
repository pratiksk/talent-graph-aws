variable "aws_region" {
  description = "AWS region for all resources"
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "t3.medium"
}

variable "neo4j_password" {
  description = "Password for the Neo4j database"
  sensitive   = true
}

variable "frontend_bucket_name" {
  description = "Globally unique S3 bucket name for the frontend"
}

variable "llm_model_id" {
  description = "Bedrock model ID for LLM inference"
  default     = "apac.anthropic.claude-3-7-sonnet-20250219-v1:0"
}

variable "embed_model_id" {
  description = "Bedrock model ID for text embeddings"
  default     = "amazon.titan-embed-text-v2:0"
}

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  default     = "talent-graph"
}

# Set to your IP ("x.x.x.x/32") in terraform.tfvars to open SSH for debugging.
# Leave empty (default) to keep port 22 closed. Remove from tfvars when done.
variable "my_ip" {
  description = "Your IP CIDR for SSH access (e.g. 1.2.3.4/32). Empty = no SSH rule."
  default     = ""
}

variable "key_name" {
  description = "EC2 key pair name for SSH access. Empty = no key attached."
  default     = ""
}

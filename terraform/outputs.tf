output "ec2_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.api.public_ip
}

output "api_url" {
  description = "Base URL for the FastAPI service"
  value       = "http://${aws_instance.api.public_ip}:8000"
}

output "neo4j_browser_url" {
  description = "Neo4j Browser URL (accessible only from your IP)"
  value       = "http://${aws_instance.api.public_ip}:7474"
}

output "cloudfront_url" {
  description = "CloudFront URL for the frontend"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "s3_bucket" {
  description = "S3 bucket hosting the static frontend"
  value       = aws_s3_bucket.frontend.id
}

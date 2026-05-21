resource "aws_s3_bucket" "frontend" {
  bucket        = var.frontend_bucket_name
  force_destroy = true
  tags          = merge(local.tags, { Name = "${var.project_name}-frontend" })
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket     = aws_s3_bucket.frontend.id
  depends_on = [aws_s3_bucket_public_access_block.frontend]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
    }]
  })
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }
}

locals {
  dist_dir = "${path.module}/../frontend/dist"

  # Run `npm run build` in frontend/ before terraform apply.
  # index.html is handled separately so Terraform can inject the api_base URL.
  dist_assets = {
    for f in fileset(local.dist_dir, "**") : f => f
    if f != "index.html"
  }

  mime_types = {
    js   = "application/javascript"
    css  = "text/css"
    html = "text/html"
    svg  = "image/svg+xml"
    png  = "image/png"
    ico  = "image/x-icon"
    json = "application/json"
    txt  = "text/plain"
  }
}

# All hashed assets from the Vite build (JS chunks, CSS, etc.)
resource "aws_s3_object" "dist_assets" {
  for_each = local.dist_assets

  bucket       = aws_s3_bucket.frontend.id
  key          = each.value
  source       = "${local.dist_dir}/${each.value}"
  etag         = filemd5("${local.dist_dir}/${each.value}")
  content_type = lookup(local.mime_types, element(split(".", each.value), length(split(".", each.value)) - 1), "application/octet-stream")
}

# index.html gets the CloudFront URL baked in at apply time
resource "aws_s3_object" "index_html" {
  bucket       = aws_s3_bucket.frontend.id
  key          = "index.html"
  content_type = "text/html"
  content = templatefile("${local.dist_dir}/index.html", {
    api_base = "https://${aws_cloudfront_distribution.frontend.domain_name}/api"
  })
  etag = md5(templatefile("${local.dist_dir}/index.html", {
    api_base = "https://${aws_cloudfront_distribution.frontend.domain_name}/api"
  }))
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  tags                = local.tags

  origin {
    origin_id   = "s3-frontend"
    domain_name = aws_s3_bucket_website_configuration.frontend.website_endpoint

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # CloudFront proxies /api/* to EC2 over HTTP so the browser only ever sees HTTPS.
  # The EC2 API has no TLS cert (bare IP, no domain) so direct calls from the HTTPS
  # frontend would be blocked as mixed-content. In production you would terminate TLS
  # at an ALB with an ACM certificate instead.
  origin {
    origin_id   = "ec2-api"
    domain_name = aws_instance.api.public_dns  # public_dns required; CloudFront rejects bare IPs

    custom_origin_config {
      http_port                = 8000
      https_port               = 443
      origin_protocol_policy   = "http-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 60
      origin_keepalive_timeout = 60
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "ec2-api"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = true
      headers      = ["Accept", "Content-Type", "Origin"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 300
    max_ttl     = 3600
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

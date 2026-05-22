resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = merge(local.tags, { Name = "${var.project_name}-vpc" })
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  tags                    = merge(local.tags, { Name = "${var.project_name}-public" })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = merge(local.tags, { Name = "${var.project_name}-igw" })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.tags, { Name = "${var.project_name}-rt" })
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "api" {
  name        = "${var.project_name}-api"
  description = "Talent Graph API security group"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${var.project_name}-api-sg" })
}

# Opened only when my_ip is set in terraform.tfvars. Remove var to close.
resource "aws_security_group_rule" "api_ssh" {
  count             = var.my_ip != "" ? 1 : 0
  type              = "ingress"
  description       = "SSH (dev only)"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = [var.my_ip]
  security_group_id = aws_security_group.api.id
}

# CloudFront creates this managed SG when the VPC Origin is provisioned.
# EC2 must allow ingress from it (CIDR alone is insufficient for VPC Origin traffic).
data "aws_security_group" "cloudfront_vpc_origin_sg" {
  name       = "CloudFront-VPCOrigins-Service-SG"
  vpc_id     = aws_vpc.main.id
  depends_on = [aws_cloudfront_vpc_origin.api]
}

resource "aws_security_group_rule" "api_8000_cloudfront" {
  type                     = "ingress"
  description              = "FastAPI (CloudFront VPC Origin)"
  from_port                = 8000
  to_port                  = 8000
  protocol                 = "tcp"
  source_security_group_id = data.aws_security_group.cloudfront_vpc_origin_sg.id
  security_group_id        = aws_security_group.api.id
}

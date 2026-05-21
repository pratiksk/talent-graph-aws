# Demo: FastAPI and Neo4j both run on this single instance (see cloud-init.yaml).
# In production these would be separate — Neo4j on a dedicated instance or AuraDB,
# API on EC2/ECS behind an ALB, with VPC-internal connectivity between them.
resource "aws_instance" "api" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.api.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = var.key_name != "" ? var.key_name : null
  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  user_data_base64 = base64gzip(templatefile("${path.module}/cloud-init.yaml", {
    neo4j_password = var.neo4j_password
    aws_region     = var.aws_region
    llm_model_id   = var.llm_model_id
    embed_model_id = var.embed_model_id
  }))

  user_data_replace_on_change = true

  tags = merge(local.tags, { Name = "${var.project_name}-api" })
}

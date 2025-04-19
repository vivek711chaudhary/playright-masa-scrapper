#!/bin/bash

# Configuration
VM_NAME="playwright-mcp-server"
ZONE="us-central1-a"
MACHINE_TYPE="e2-medium"
SSH_USER="your-ssh-username"  # Replace with your username
SERVER_IP="your-server-ip"    # Replace with your server IP

# Instructions for manual deployment to a VM
echo "=== Manual VM Deployment Instructions ==="
echo -e "\n1. SSH into your VM instance:"
echo "   ssh $SSH_USER@$SERVER_IP"
echo -e "\n2. Clone the repository:"
echo "   git clone https://github.com/vivek711chaudhary/playright-masa-scrapper.git"
echo -e "\n3. Navigate to the project directory:"
echo "   cd playright-masa-scrapper"
echo -e "\n4. Install Docker if not already installed:"
echo "   sudo apt-get update"
echo "   sudo apt-get install -y docker.io"
echo "   sudo systemctl enable docker"
echo "   sudo systemctl start docker"
echo "   sudo usermod -aG docker \$USER"
echo -e "\n5. Build and run the Docker container:"
echo "   docker build -t playwright-mcp ."
echo "   docker run -d --name playwright-mcp -p 3000:3000 --restart unless-stopped --env-file .env playwright-mcp"
echo -e "\n6. Test the deployment:"
echo "   curl http://localhost:3000/health"
echo -e "\nNOTE: Make sure port 3000 is open in your firewall"

# If you want to automate deployment using gcloud to create a VM:
echo -e "\n\n=== Automated VM Creation with gcloud ==="
echo "To create a new VM instance with gcloud, run these commands:"
echo -e "\ngcloud compute instances create $VM_NAME \\"
echo "  --zone=$ZONE \\"
echo "  --machine-type=$MACHINE_TYPE \\"
echo "  --image-family=ubuntu-2004-lts \\"
echo "  --image-project=ubuntu-os-cloud \\"
echo "  --boot-disk-size=20GB \\"
echo "  --tags=http-server,https-server"
echo -e "\ngcloud compute firewall-rules create allow-playwright-mcp \\"
echo "  --direction=INGRESS \\"
echo "  --priority=1000 \\"
echo "  --network=default \\"
echo "  --action=ALLOW \\"
echo "  --rules=tcp:3000 \\"
echo "  --source-ranges=0.0.0.0/0 \\"
echo "  --target-tags=http-server" 
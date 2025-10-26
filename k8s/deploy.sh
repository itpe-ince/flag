#!/bin/bash

# Kubernetes Deployment Script for Flag Guessing Game

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if we can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    print_success "kubectl is available and connected to cluster"
}

# Create namespace
create_namespace() {
    print_status "Creating namespace..."
    kubectl apply -f namespace.yaml
    print_success "Namespace created/updated"
}

# Apply secrets
apply_secrets() {
    print_status "Applying secrets..."
    
    # Check if secrets file exists
    if [ ! -f "secrets.yaml" ]; then
        print_error "secrets.yaml not found. Please create it with proper base64 encoded secrets."
        exit 1
    fi
    
    kubectl apply -f secrets.yaml
    print_success "Secrets applied"
}

# Apply config maps
apply_config() {
    print_status "Applying configuration..."
    kubectl apply -f configmap.yaml
    print_success "Configuration applied"
}

# Deploy database
deploy_database() {
    print_status "Deploying PostgreSQL database..."
    kubectl apply -f postgres.yaml
    
    print_status "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/postgres -n flag-guessing-game
    print_success "PostgreSQL deployed and ready"
}

# Deploy Redis
deploy_redis() {
    print_status "Deploying Redis cache..."
    kubectl apply -f redis.yaml
    
    print_status "Waiting for Redis to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/redis -n flag-guessing-game
    print_success "Redis deployed and ready"
}

# Deploy backend
deploy_backend() {
    print_status "Deploying backend service..."
    kubectl apply -f backend.yaml
    
    print_status "Waiting for backend to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/backend -n flag-guessing-game
    print_success "Backend deployed and ready"
}

# Deploy frontend
deploy_frontend() {
    print_status "Deploying frontend service..."
    kubectl apply -f frontend.yaml
    
    print_status "Waiting for frontend to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/frontend -n flag-guessing-game
    print_success "Frontend deployed and ready"
}

# Deploy ingress
deploy_ingress() {
    print_status "Deploying ingress..."
    kubectl apply -f ingress.yaml
    print_success "Ingress deployed"
}

# Check deployment status
check_status() {
    print_status "Checking deployment status..."
    
    echo ""
    print_status "Pods:"
    kubectl get pods -n flag-guessing-game
    
    echo ""
    print_status "Services:"
    kubectl get services -n flag-guessing-game
    
    echo ""
    print_status "Ingress:"
    kubectl get ingress -n flag-guessing-game
    
    echo ""
    print_status "Persistent Volume Claims:"
    kubectl get pvc -n flag-guessing-game
}

# Get logs
get_logs() {
    local service="$1"
    
    if [ -z "$service" ]; then
        print_status "Available services: backend, frontend, postgres, redis"
        return
    fi
    
    print_status "Getting logs for $service..."
    kubectl logs -l app="$service" -n flag-guessing-game --tail=50
}

# Scale deployment
scale_deployment() {
    local service="$1"
    local replicas="$2"
    
    if [ -z "$service" ] || [ -z "$replicas" ]; then
        print_error "Usage: scale <service> <replicas>"
        return 1
    fi
    
    print_status "Scaling $service to $replicas replicas..."
    kubectl scale deployment "$service" --replicas="$replicas" -n flag-guessing-game
    print_success "$service scaled to $replicas replicas"
}

# Delete deployment
delete_deployment() {
    print_warning "This will delete the entire deployment. Are you sure? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_status "Deleting deployment..."
        kubectl delete namespace flag-guessing-game
        print_success "Deployment deleted"
    else
        print_status "Deletion cancelled"
    fi
}

# Update images
update_images() {
    local component="$1"
    local tag="${2:-latest}"
    
    if [ -z "$component" ]; then
        print_error "Usage: update-images <backend|frontend|all> [tag]"
        return 1
    fi
    
    if [ "$component" = "all" ]; then
        print_status "Updating all images to tag: $tag"
        kubectl set image deployment/backend backend=ghcr.io/your-username/flag-guessing-game-backend:$tag -n flag-guessing-game
        kubectl set image deployment/frontend frontend=ghcr.io/your-username/flag-guessing-game-frontend:$tag -n flag-guessing-game
    else
        print_status "Updating $component image to tag: $tag"
        kubectl set image deployment/$component $component=ghcr.io/your-username/flag-guessing-game-$component:$tag -n flag-guessing-game
    fi
    
    print_success "Images updated"
}

# Backup database
backup_database() {
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    
    print_status "Creating database backup: $backup_name"
    
    kubectl exec -n flag-guessing-game deployment/postgres -- pg_dump -U postgres flag_guessing_game > "$backup_name.sql"
    
    print_success "Database backup created: $backup_name.sql"
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy              Full deployment (all components)"
    echo "  deploy-db           Deploy database only"
    echo "  deploy-redis        Deploy Redis only"
    echo "  deploy-backend      Deploy backend only"
    echo "  deploy-frontend     Deploy frontend only"
    echo "  deploy-ingress      Deploy ingress only"
    echo "  status              Show deployment status"
    echo "  logs [SERVICE]      Show logs for service"
    echo "  scale SERVICE REPLICAS  Scale service to N replicas"
    echo "  update-images COMPONENT [TAG]  Update container images"
    echo "  backup              Create database backup"
    echo "  delete              Delete entire deployment"
    echo ""
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 logs backend"
    echo "  $0 scale backend 3"
    echo "  $0 update-images frontend v1.2.0"
}

# Main script logic
main() {
    local command="$1"
    local arg1="$2"
    local arg2="$3"
    
    case "$command" in
        "deploy")
            check_kubectl
            create_namespace
            apply_secrets
            apply_config
            deploy_database
            deploy_redis
            deploy_backend
            deploy_frontend
            deploy_ingress
            check_status
            print_success "Full deployment completed!"
            ;;
        "deploy-db")
            check_kubectl
            create_namespace
            apply_secrets
            apply_config
            deploy_database
            ;;
        "deploy-redis")
            check_kubectl
            create_namespace
            apply_secrets
            apply_config
            deploy_redis
            ;;
        "deploy-backend")
            check_kubectl
            create_namespace
            apply_secrets
            apply_config
            deploy_backend
            ;;
        "deploy-frontend")
            check_kubectl
            create_namespace
            apply_secrets
            apply_config
            deploy_frontend
            ;;
        "deploy-ingress")
            check_kubectl
            deploy_ingress
            ;;
        "status")
            check_kubectl
            check_status
            ;;
        "logs")
            check_kubectl
            get_logs "$arg1"
            ;;
        "scale")
            check_kubectl
            scale_deployment "$arg1" "$arg2"
            ;;
        "update-images")
            check_kubectl
            update_images "$arg1" "$arg2"
            ;;
        "backup")
            check_kubectl
            backup_database
            ;;
        "delete")
            check_kubectl
            delete_deployment
            ;;
        "help"|"--help"|"-h"|"")
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
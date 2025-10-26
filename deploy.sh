#!/bin/bash

# Flag Guessing Game Deployment Script
# This script handles deployment to different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to validate environment file
validate_env() {
    local env_file="$1"
    
    if [ ! -f "$env_file" ]; then
        print_error "Environment file $env_file not found"
        return 1
    fi
    
    # Check for required variables
    local required_vars=("JWT_SECRET" "DB_PASSWORD")
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file"; then
            print_error "Required environment variable $var not found in $env_file"
            return 1
        fi
        
        # Check if variable has a value
        local value=$(grep "^${var}=" "$env_file" | cut -d'=' -f2-)
        if [ -z "$value" ] || [ "$value" = "your-secure-password" ] || [ "$value" = "your-secret-key" ]; then
            print_error "Environment variable $var needs to be set to a secure value in $env_file"
            return 1
        fi
    done
    
    print_success "Environment file validation passed"
    return 0
}

# Function to build images
build_images() {
    print_status "Building Docker images..."
    
    docker-compose build --no-cache
    
    print_success "Docker images built successfully"
}

# Function to start services
start_services() {
    local env_file="$1"
    
    print_status "Starting services with environment file: $env_file"
    
    # Load environment file
    export $(grep -v '^#' "$env_file" | xargs)
    
    # Start services
    docker-compose --env-file "$env_file" up -d
    
    print_success "Services started successfully"
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    docker-compose run --rm migrate
    
    print_success "Database migrations completed"
}

# Function to seed flag data
seed_data() {
    print_status "Seeding flag data..."
    
    docker-compose run --rm seed
    
    print_success "Flag data seeding completed"
}

# Function to check service health
check_health() {
    print_status "Checking service health..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps | grep -q "Up (healthy)"; then
            print_success "All services are healthy"
            return 0
        fi
        
        print_status "Waiting for services to be healthy... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    print_error "Services failed to become healthy within expected time"
    docker-compose ps
    return 1
}

# Function to show service status
show_status() {
    print_status "Service status:"
    docker-compose ps
    
    print_status "Service logs (last 20 lines):"
    docker-compose logs --tail=20
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    docker-compose down
    print_success "Services stopped"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    print_success "Cleanup completed"
}

# Function to backup data
backup_data() {
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    
    print_status "Creating backup in $backup_dir..."
    mkdir -p "$backup_dir"
    
    # Backup database
    docker-compose exec -T postgres pg_dump -U postgres flag_guessing_game > "$backup_dir/database.sql"
    
    # Backup Redis data
    docker-compose exec -T redis redis-cli BGSAVE
    docker cp "$(docker-compose ps -q redis):/data/dump.rdb" "$backup_dir/redis.rdb"
    
    print_success "Backup created in $backup_dir"
}

# Function to restore data
restore_data() {
    local backup_dir="$1"
    
    if [ ! -d "$backup_dir" ]; then
        print_error "Backup directory $backup_dir not found"
        exit 1
    fi
    
    print_status "Restoring data from $backup_dir..."
    
    # Restore database
    if [ -f "$backup_dir/database.sql" ]; then
        docker-compose exec -T postgres psql -U postgres -d flag_guessing_game < "$backup_dir/database.sql"
        print_success "Database restored"
    fi
    
    # Restore Redis data
    if [ -f "$backup_dir/redis.rdb" ]; then
        docker-compose stop redis
        docker cp "$backup_dir/redis.rdb" "$(docker-compose ps -q redis):/data/dump.rdb"
        docker-compose start redis
        print_success "Redis data restored"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy [ENV_FILE]     Deploy the application (default: .env)"
    echo "  start [ENV_FILE]      Start services (default: .env)"
    echo "  stop                  Stop services"
    echo "  restart [ENV_FILE]    Restart services"
    echo "  status                Show service status"
    echo "  logs [SERVICE]        Show logs for all services or specific service"
    echo "  build                 Build Docker images"
    echo "  migrate               Run database migrations"
    echo "  seed                  Seed flag data"
    echo "  backup                Create data backup"
    echo "  restore [BACKUP_DIR]  Restore data from backup"
    echo "  cleanup               Stop services and clean up"
    echo "  health                Check service health"
    echo ""
    echo "Examples:"
    echo "  $0 deploy .env.production"
    echo "  $0 start"
    echo "  $0 logs backend"
    echo "  $0 backup"
    echo "  $0 restore ./backups/20231201_120000"
}

# Main script logic
main() {
    local command="$1"
    local arg="$2"
    
    case "$command" in
        "deploy")
            local env_file="${arg:-.env}"
            check_prerequisites
            validate_env "$env_file"
            build_images
            start_services "$env_file"
            run_migrations
            seed_data
            check_health
            show_status
            print_success "Deployment completed successfully!"
            print_status "Application is available at: http://localhost:3500"
            ;;
        "start")
            local env_file="${arg:-.env}"
            check_prerequisites
            validate_env "$env_file"
            start_services "$env_file"
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            local env_file="${arg:-.env}"
            stop_services
            start_services "$env_file"
            ;;
        "status")
            show_status
            ;;
        "logs")
            if [ -n "$arg" ]; then
                docker-compose logs -f "$arg"
            else
                docker-compose logs -f
            fi
            ;;
        "build")
            check_prerequisites
            build_images
            ;;
        "migrate")
            run_migrations
            ;;
        "seed")
            seed_data
            ;;
        "backup")
            backup_data
            ;;
        "restore")
            if [ -z "$arg" ]; then
                print_error "Backup directory required for restore command"
                exit 1
            fi
            restore_data "$arg"
            ;;
        "cleanup")
            cleanup
            ;;
        "health")
            check_health
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
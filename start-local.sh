#!/bin/bash

# VeggieScore Local Development Startup Script
# Builds and starts all services for local testing

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing=0

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        missing=1
    else
        print_success "Docker $(docker --version | cut -d' ' -f3)"
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        missing=1
    else
        print_success "Docker Compose $(docker-compose --version | cut -d' ' -f3)"
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        missing=1
    else
        print_success "Docker daemon is running"
    fi

    # Check for .env file
    if [ ! -f .env ]; then
        print_warning ".env file not found, creating from .env.example"
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created .env file"
            print_warning "Please edit .env with your configuration"
        else
            print_error ".env.example not found"
            missing=1
        fi
    else
        print_success ".env file exists"
    fi

    if [ $missing -eq 1 ]; then
        print_error "Prerequisites check failed. Please install missing dependencies."
        exit 1
    fi
}

# Clean up old containers
cleanup() {
    print_header "Cleaning Up Old Containers"

    docker-compose -f docker-compose.yml -f docker-compose.local.yml down -v 2>/dev/null || true
    print_success "Cleaned up old containers"
}

# Build images
build_images() {
    print_header "Building Docker Images"

    docker-compose -f docker-compose.yml -f docker-compose.local.yml build --parallel
    print_success "Built all images"
}

# Start services
start_services() {
    print_header "Starting Services"

    # Start infrastructure first
    echo "Starting infrastructure services (Redis, PostgreSQL)..."
    docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d redis postgres

    # Wait for infrastructure to be ready
    echo "Waiting for infrastructure to be ready..."
    sleep 5

    # Start workers
    echo "Starting worker services..."
    docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d \
        crawler-worker \
        ocr-worker \
        parser-worker \
        labeler-worker \
        embeddings-worker

    # Start admin dashboard
    echo "Starting admin dashboard..."
    docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d admin

    print_success "All services started"
}

# Show service status
show_status() {
    print_header "Service Status"

    docker-compose -f docker-compose.yml -f docker-compose.local.yml ps
}

# Show logs
show_logs() {
    print_header "Service Logs"

    echo -e "${YELLOW}Following logs (Ctrl+C to exit)...${NC}\n"
    docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f
}

# Health check
health_check() {
    print_header "Health Check"

    # Check Redis
    if docker-compose -f docker-compose.yml -f docker-compose.local.yml exec -T redis redis-cli ping &> /dev/null; then
        print_success "Redis is healthy"
    else
        print_error "Redis is not responding"
    fi

    # Check PostgreSQL
    if docker-compose -f docker-compose.yml -f docker-compose.local.yml exec -T postgres pg_isready -U postgres &> /dev/null; then
        print_success "PostgreSQL is healthy"
    else
        print_error "PostgreSQL is not responding"
    fi

    # Show URLs
    echo ""
    echo -e "${BLUE}Service URLs:${NC}"
    echo -e "  PostgreSQL:       ${GREEN}localhost:5432${NC}"
    echo -e "  Redis:            ${GREEN}localhost:6379${NC}"
    echo -e "  Admin Dashboard:  ${GREEN}http://localhost:3000${NC}"
    echo ""
}

# Main menu
show_menu() {
    echo ""
    echo "VeggieScore Local Development"
    echo "=============================="
    echo "1) Start all services"
    echo "2) Stop all services"
    echo "3) Restart all services"
    echo "4) View logs"
    echo "5) View status"
    echo "6) Health check"
    echo "7) Rebuild images"
    echo "8) Clean up everything"
    echo "9) Exit"
    echo ""
    read -p "Select an option: " choice
}

# Parse command line arguments
case "${1:-menu}" in
    start)
        check_prerequisites
        cleanup
        build_images
        start_services
        show_status
        health_check
        ;;
    stop)
        print_header "Stopping Services"
        docker-compose -f docker-compose.yml -f docker-compose.local.yml down
        print_success "All services stopped"
        ;;
    restart)
        print_header "Restarting Services"
        docker-compose -f docker-compose.yml -f docker-compose.local.yml restart
        print_success "All services restarted"
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    health)
        health_check
        ;;
    rebuild)
        check_prerequisites
        build_images
        ;;
    clean)
        print_header "Cleaning Up Everything"
        docker-compose -f docker-compose.yml -f docker-compose.local.yml down -v --rmi local
        print_success "Cleaned up all containers, volumes, and images"
        ;;
    menu)
        while true; do
            show_menu
            case $choice in
                1)
                    check_prerequisites
                    cleanup
                    build_images
                    start_services
                    show_status
                    health_check
                    ;;
                2)
                    docker-compose -f docker-compose.yml -f docker-compose.local.yml down
                    print_success "All services stopped"
                    ;;
                3)
                    docker-compose -f docker-compose.yml -f docker-compose.local.yml restart
                    print_success "All services restarted"
                    ;;
                4)
                    show_logs
                    ;;
                5)
                    show_status
                    ;;
                6)
                    health_check
                    ;;
                7)
                    build_images
                    ;;
                8)
                    docker-compose -f docker-compose.yml -f docker-compose.local.yml down -v --rmi local
                    print_success "Cleaned up everything"
                    ;;
                9)
                    print_success "Goodbye!"
                    exit 0
                    ;;
                *)
                    print_error "Invalid option"
                    ;;
            esac
            read -p "Press Enter to continue..."
        done
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|status|health|rebuild|clean|menu}"
        echo ""
        echo "Commands:"
        echo "  start    - Build and start all services"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - View logs from all services"
        echo "  status   - Show service status"
        echo "  health   - Run health check"
        echo "  rebuild  - Rebuild all images"
        echo "  clean    - Remove all containers, volumes, and images"
        echo "  menu     - Show interactive menu (default)"
        exit 1
        ;;
esac

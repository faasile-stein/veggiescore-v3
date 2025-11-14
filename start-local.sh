#!/bin/bash

# VeggieScore Local Development Startup Script
# Builds and starts all services for local testing with Supabase Local

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

    # Check Supabase CLI
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI is not installed"
        echo "  Install with: npm install -g supabase"
        echo "  Or: brew install supabase/tap/supabase (macOS)"
        missing=1
    else
        print_success "Supabase CLI $(supabase --version | cut -d' ' -f3)"
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
            print_warning "Note: Supabase local will auto-configure most variables"
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

# Start Supabase local
start_supabase() {
    print_header "Starting Supabase Local"

    if supabase status &> /dev/null; then
        print_success "Supabase is already running"
    else
        echo "Initializing Supabase (this may take a minute on first run)..."
        supabase start

        # Get the credentials
        echo ""
        print_success "Supabase started successfully!"
        echo ""
        echo -e "${BLUE}Supabase Credentials:${NC}"
        supabase status | grep -E "(API URL|anon key|service_role key|DB URL|Studio URL)"
        echo ""
    fi
}

# Stop Supabase local
stop_supabase() {
    print_header "Stopping Supabase Local"

    if supabase status &> /dev/null; then
        supabase stop
        print_success "Supabase stopped"
    else
        print_warning "Supabase is not running"
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

    # Start Redis
    echo "Starting Redis..."
    docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d redis

    # Wait for Redis to be ready
    echo "Waiting for Redis to be ready..."
    sleep 3

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

    echo -e "${BLUE}Supabase Services:${NC}"
    supabase status 2>/dev/null || echo "  Supabase not running"

    echo ""
    echo -e "${BLUE}Docker Services:${NC}"
    docker-compose -f docker-compose.yml -f docker-compose.local.yml ps
}

# Show logs
show_logs() {
    print_header "Service Logs"

    echo "Which logs would you like to view?"
    echo "1) All Docker services"
    echo "2) Crawler worker"
    echo "3) OCR worker"
    echo "4) Parser worker"
    echo "5) Labeler worker"
    echo "6) Embeddings worker"
    echo "7) Admin dashboard"
    echo "8) Redis"
    echo "9) Supabase logs"
    echo ""
    read -p "Select an option (or press Enter for all): " log_choice

    case $log_choice in
        2) docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f crawler-worker ;;
        3) docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f ocr-worker ;;
        4) docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f parser-worker ;;
        5) docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f labeler-worker ;;
        6) docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f embeddings-worker ;;
        7) docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f admin ;;
        8) docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f redis ;;
        9) docker logs -f supabase_db_veggiescore ;;
        *) docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f ;;
    esac
}

# Health check
health_check() {
    print_header "Health Check"

    # Check Supabase
    if supabase status &> /dev/null; then
        print_success "Supabase is healthy"
    else
        print_error "Supabase is not running"
    fi

    # Check Redis
    if docker-compose -f docker-compose.yml -f docker-compose.local.yml exec -T redis redis-cli ping &> /dev/null; then
        print_success "Redis is healthy"
    else
        print_error "Redis is not responding"
    fi

    # Show URLs
    echo ""
    echo -e "${BLUE}Service URLs:${NC}"
    echo -e "  Supabase Studio:  ${GREEN}http://localhost:54323${NC}"
    echo -e "  Supabase API:     ${GREEN}http://localhost:54321${NC}"
    echo -e "  Database:         ${GREEN}postgresql://postgres:postgres@localhost:54322/postgres${NC}"
    echo -e "  Redis:            ${GREEN}localhost:8379${NC}"
    echo -e "  Admin Dashboard:  ${GREEN}http://localhost:8000${NC}"
    echo ""
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"

    if supabase status &> /dev/null; then
        supabase db push
        print_success "Migrations applied"
    else
        print_error "Supabase is not running. Start it first with './start-local.sh start'"
    fi
}

# Reset database
reset_database() {
    print_header "Resetting Database"

    read -p "This will delete all data. Are you sure? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        supabase db reset
        print_success "Database reset complete"
    else
        print_warning "Database reset cancelled"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "VeggieScore Local Development (with Supabase Local)"
    echo "===================================================="
    echo "1)  Start all services"
    echo "2)  Stop all services"
    echo "3)  Restart all services"
    echo "4)  View logs"
    echo "5)  View status"
    echo "6)  Health check"
    echo "7)  Rebuild images"
    echo "8)  Run database migrations"
    echo "9)  Reset database"
    echo "10) Open Supabase Studio"
    echo "11) Clean up everything"
    echo "12) Exit"
    echo ""
    read -p "Select an option: " choice
}

# Parse command line arguments
case "${1:-menu}" in
    start)
        check_prerequisites
        start_supabase
        cleanup
        build_images
        start_services
        show_status
        health_check
        ;;
    stop)
        print_header "Stopping Services"
        docker-compose -f docker-compose.yml -f docker-compose.local.yml down
        stop_supabase
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
    migrate)
        run_migrations
        ;;
    reset)
        reset_database
        ;;
    clean)
        print_header "Cleaning Up Everything"
        docker-compose -f docker-compose.yml -f docker-compose.local.yml down -v --rmi local
        supabase stop --no-backup
        print_success "Cleaned up all containers, volumes, and images"
        ;;
    menu)
        while true; do
            show_menu
            case $choice in
                1)
                    check_prerequisites
                    start_supabase
                    cleanup
                    build_images
                    start_services
                    show_status
                    health_check
                    ;;
                2)
                    docker-compose -f docker-compose.yml -f docker-compose.local.yml down
                    stop_supabase
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
                    run_migrations
                    ;;
                9)
                    reset_database
                    ;;
                10)
                    echo "Opening Supabase Studio..."
                    open "http://localhost:54323" 2>/dev/null || xdg-open "http://localhost:54323" 2>/dev/null || echo "Please open http://localhost:54323 in your browser"
                    ;;
                11)
                    docker-compose -f docker-compose.yml -f docker-compose.local.yml down -v --rmi local
                    supabase stop --no-backup
                    print_success "Cleaned up everything"
                    ;;
                12)
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
        echo "Usage: $0 {start|stop|restart|logs|status|health|rebuild|migrate|reset|clean|menu}"
        echo ""
        echo "Commands:"
        echo "  start    - Build and start all services (including Supabase)"
        echo "  stop     - Stop all services (including Supabase)"
        echo "  restart  - Restart all services"
        echo "  logs     - View logs from services"
        echo "  status   - Show service status"
        echo "  health   - Run health check"
        echo "  rebuild  - Rebuild all images"
        echo "  migrate  - Run database migrations"
        echo "  reset    - Reset database (WARNING: deletes all data)"
        echo "  clean    - Remove all containers, volumes, and images"
        echo "  menu     - Show interactive menu (default)"
        exit 1
        ;;
esac

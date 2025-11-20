# ERP Manufacturing System - Backend API

Complete CQRS-based backend system for manufacturing ERP with command and query separation.

## 🏗️ Architecture Overview

### CQRS Pattern Implementation
```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   FRONTEND      │    │ API GATEWAY  │    │   BACKEND       │
│                 │    │   (Nginx)    │    │                 │
│ React/Vue/etc   │◄──►│              │◄──►│ Command Service │
│                 │    │ Port 80/443  │    │ (Node.js 3108)  │
└─────────────────┘    │              │    │                 │
                       │              │◄──►│ Query Service   │
                       │              │    │ (FastAPI 2025)  │
                       └──────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
├── app/                          # FastAPI Query Service (Python)
│   ├── api/                     # API endpoints
│   │   └── v1/endpoints/        # API version 1 endpoints
│   ├── core/                    # Core configurations
│   ├── database/                # Database connections
│   ├── models/                  # SQLAlchemy models
│   ├── schemas/                 # Pydantic schemas
│   └── get/                     # Query service modules
├── node/                        # Command Service (Node.js)
│   ├── config/                  # Database configuration
│   ├── controllers/             # Business logic controllers
│   ├── middleware/              # Authentication & validation
│   ├── models/                  # Sequelize models
│   ├── routes/                  # API routes
│   └── utils/                   # Utility functions
├── requirements.txt             # Python dependencies
└── ecosystem.query.config.js    # PM2 configuration
```

## 🚀 Services

### Command Service (Node.js - Port 3108)
**Responsibilities:** CREATE, UPDATE, DELETE operations
- Production order management
- Machine output recording
- Quality control operations
- Warehouse management (delivery, returns)
- User authentication

**Key Features:**
- JWT authentication
- Auto job order generation (JO-YYYYMMDD-XXXX)
- Transaction management
- CQRS enforcement middleware
- Enhanced JSON parsing

### Query Service (FastAPI - Port 2025)
**Responsibilities:** READ operations, dashboard, analytics
- Production order queries
- Inventory balance reports
- Dashboard summaries
- Historical data analysis
- Mobile-optimized endpoints

**Key Features:**
- High-performance read operations
- Pagination support
- Filter and search capabilities
- Mobile API optimization
- Real-time dashboard data

## 🔧 Installation & Setup

### Prerequisites
- Node.js 16+
- Python 3.8+
- MySQL 8.0+
- PM2 (for production)

### Command Service Setup (Node.js)
```bash
cd node
npm install
npm start
# Service runs on port 3108
```

### Query Service Setup (FastAPI)
```bash
pip install -r requirements.txt
python app/main.py
# Service runs on port 2025
```

### Production Deployment
```bash
# Start Query Service with PM2
pm2 start ecosystem.query.config.js

# Start Command Service
cd node && pm2 start server.js --name "command-service"
```

## 📊 Database Schema

### Core Tables
- **production_orders**: Main production planning
- **output_mc**: Machine production output
- **oqc**: Quality control records
- **delivery**: Warehouse delivery records
- **return_customer**: Customer return tracking
- **transfer_qc**: QC transfer operations

### ERP Extension Tables
- **inventory_locations**: Warehouse locations
- **inventory_balances**: Stock levels per location
- **inventory_movements**: All stock movements
- **machines**: Production machine master
- **bill_of_materials**: Product BOM structure
- **workflow_states**: Process workflow tracking

## 🔐 Authentication

### Available Users
| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Production | `adm_production01@tle.co.id` | `prod01` | Production management |
| QC | `adm_qc01@tle.co.id` | `qc01` | Quality control |
| Warehouse | `adm_warehouse01@tle.co.id` | `wh01` | Warehouse operations |

### JWT Token Usage
```javascript
// All authenticated requests must include:
headers: {
  'Authorization': 'Bearer <jwt_token>',
  'Content-Type': 'application/json'
}
```

## 🌐 API Endpoints

### Command API (http://server:3108)
```
POST /auth/login                    # Authentication
POST /production/orders             # Create production order
PUT  /production/orders/:id         # Update production order
DELETE /production/orders/:id       # Cancel production order
POST /production/outputs            # Record machine output
POST /qc/oqc                       # Create OQC record
POST /warehouse/delivery           # Create delivery record
POST /warehouse/returns            # Create return record
```

### Query API (http://server:2025)
```
GET /erp/production/orders         # List production orders
GET /erp/inventory/balances        # Inventory status
GET /erp/dashboard/summary         # Dashboard metrics
GET /erp/machines                  # Machine list
GET /mobile/*                      # Mobile-optimized endpoints
```

## 🎯 Key Features

### ✅ Production Management
- Auto job order generation with daily sequence
- Machine scheduling and assignment
- Material reservation system
- Production progress tracking
- Workflow state management

### ✅ Quality Control
- Incoming/Outgoing QC processes
- Inspection plans and results
- Non-conformance reporting
- Quality metrics tracking

### ✅ Warehouse Management
- Multi-location inventory
- Stock movement tracking
- Delivery and return processing
- WIP inventory management

### ✅ Dashboard & Analytics
- Real-time production metrics
- Machine utilization tracking
- Inventory status monitoring
- Quality performance indicators

### ✅ Mobile API
- Mobile-optimized data structures
- Device capability detection
- Offline support preparation
- Push notification ready

## 🛠️ Development

### Adding New Endpoints

#### Command Service (Node.js)
1. Create controller in `node/controllers/`
2. Add routes in `node/routes/`
3. Update models if needed in `node/models/`

#### Query Service (FastAPI)
1. Create endpoint in `app/api/v1/endpoints/`
2. Add models in `app/models/`
3. Create schemas in `app/schemas/`
4. Update router in `app/api/v1/api.py`

### Database Migrations
```bash
# Command Service (Sequelize)
cd node
npx sequelize migration:generate --name add_new_feature
npx sequelize db:migrate

# Query Service (Alembic)
alembic revision --autogenerate -m "Add new feature"
alembic upgrade head
```

## 📱 Mobile Support

The system includes comprehensive mobile API endpoints optimized for:
- Field operations
- Offline capability
- Real-time synchronization
- Device-specific formatting

### Mobile Endpoints
```
GET /mobile/dashboard/summary      # Mobile dashboard
GET /mobile/production/orders/active  # Active orders
GET /mobile/quality/inspections/pending  # QC tasks
GET /mobile/warehouse/tasks        # Warehouse operations
```

## 🔒 Security Features

- JWT token-based authentication
- Role-based access control
- CQRS pattern enforcement
- SQL injection protection
- Input validation and sanitization

## 📊 Performance

### Query Optimization
- Database indexing on key fields
- Pagination for large datasets
- Caching strategies for dashboard data
- Connection pooling

### Scalability
- Horizontal scaling support
- Microservice architecture
- Load balancer ready
- Container deployment ready

## 🐛 Troubleshooting

### Common Issues

#### Connection Errors
```bash
# Check service status
pm2 status
netstat -an | grep :3108
netstat -an | grep :2025
```

#### Authentication Issues
```bash
# Verify JWT token
curl -H "Authorization: Bearer <token>" http://localhost:3108/auth/verify
```

#### Database Issues
```bash
# Check database connection
mysql -u root -p -e "SHOW TABLES FROM topline;"
```

## 📞 Support

- **Documentation**: See `/docs` endpoints on both services
- **API Testing**: Use Postman collection or built-in Swagger UI
- **Development**: Check server logs for detailed error information

## 📝 License

This project is proprietary software for TLE Manufacturing Systems.

---

**Version:** 2.0.0  
**Last Updated:** September 5, 2025  
**Deployment Status:** Production Ready ✅

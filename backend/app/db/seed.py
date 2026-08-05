from datetime import date

from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.delivery import Account, AccountStatus, AllocationRole, Health, Project, ProjectPhase, ResourceAllocation, RiskLevel
from app.models.people import Employee, Role

def seed() -> None:
    # Drop all existing tables to perform a clean slate reset
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    with SessionLocal() as db:
        if db.query(Employee).first():
            return

        # 1. Studio Head
        studio_head = Employee(
            name="Praveen Kumar Baburaya",
            email="praveen.baburaya@delta.com",
            password_hash=hash_password("Demo@123"),
            title="Studio Head",
            role=Role.DELIVERY_HEAD,
            department="Delivery Leadership",
        )
        db.add(studio_head)
        db.flush()

        # 2. Program Managers
        pm1 = Employee(
            name="Gowtham Rallabandi",
            email="gowtham.rallabandi@delta.com",
            password_hash=hash_password("Demo@123"),
            title="Program Manager",
            role=Role.PROGRAM_MANAGER,
            department="Program Office",
            manager_id=studio_head.id,
        )
        pm2 = Employee(
            name="Rambabu Bagati",
            email="rambabu.bagati@delta.com",
            password_hash=hash_password("Demo@123"),
            title="Program Manager",
            role=Role.PROGRAM_MANAGER,
            department="Program Office",
            manager_id=studio_head.id,
        )
        pm3 = Employee(
            name="Kishor Babu",
            email="kishor.babu@delta.com",
            password_hash=hash_password("Demo@123"),
            title="Program Manager",
            role=Role.PROGRAM_MANAGER,
            department="Program Office",
            manager_id=studio_head.id,
        )
        db.add_all([pm1, pm2, pm3])
        db.flush()

        # 3. Project Managers
        proj_m1 = Employee(
            name="Shanmukha Rewal",
            email="shanmukha.rewal@delta.com",
            password_hash=hash_password("Demo@123"),
            title="Project Manager",
            role=Role.PROJECT_MANAGER,
            department="Delivery Operations",
            manager_id=pm1.id,
        )
        proj_m2 = Employee(
            name="Amrita Kumari",
            email="amrita.kumari@delta.com",
            password_hash=hash_password("Demo@123"),
            title="Project Manager",
            role=Role.PROJECT_MANAGER,
            department="Delivery Operations",
            manager_id=pm1.id,
        )
        proj_m3 = Employee(
            name="Balakrishnan",
            email="balakrishnan@delta.com",
            password_hash=hash_password("Demo@123"),
            title="Project Manager",
            role=Role.PROJECT_MANAGER,
            department="Delivery Operations",
            manager_id=pm1.id,
        )
        db.add_all([proj_m1, proj_m2, proj_m3])
        db.flush()

        # 4. Developers and other roles
        team_lead = Employee(
            name="Ravi Teja Reddy",
            email="ravi.teja@delta.com",
            password_hash=hash_password("Demo@123"),
            title="Team Lead",
            role=Role.TEAM_LEAD,
            department="Engineering",
            manager_id=proj_m1.id,
        )
        architect = Employee(
            name="Suresh Babu",
            email="suresh.babu@delta.com",
            password_hash=hash_password("Demo@123"),
            title="Architect",
            role=Role.TEAM_LEAD,
            department="Architecture",
            manager_id=proj_m1.id,
        )
        db.add_all([team_lead, architect])
        db.flush()

        sr_dev = Employee(
            name="Deepak Sharma",
            email="deepak.sharma@delta.com",
            password_hash=hash_password("Demo@123"),
            title="Senior Developer",
            role=Role.DEVELOPER,
            department="Engineering",
            manager_id=team_lead.id,
        )
        dev = Employee(
            name="Sneha Patil",
            email="sneha.patil@delta.com",
            password_hash=hash_password("Demo@123"),
            title="Developer",
            role=Role.DEVELOPER,
            department="Engineering",
            manager_id=team_lead.id,
        )
        qa = Employee(
            name="Karthik Venkat",
            email="karthik.venkat@delta.com",
            password_hash=hash_password("Demo@123"),
            title="QA Engineer",
            role=Role.DEVELOPER,
            department="Quality Assurance",
            manager_id=team_lead.id,
        )
        devops = Employee(
            name="Manoj Kumar",
            email="manoj.kumar@delta.com",
            password_hash=hash_password("Demo@123"),
            title="DevOps Engineer",
            role=Role.DEVELOPER,
            department="Platform",
            manager_id=team_lead.id,
        )
        db.add_all([sr_dev, dev, qa, devops])
        db.flush()

        intern = Employee(
            name="Aditya Verma",
            email="aditya.verma@delta.com",
            password_hash=hash_password("Demo@123"),
            title="Engineering Intern",
            role=Role.INTERN,
            department="Engineering",
            manager_id=dev.id,
        )
        db.add(intern)
        db.flush()

        # 5. Accounts
        acc1 = Account(
            name="Acme Corp",
            industry="Financial Services",
            country="United States",
            business_unit="Banking",
            contract_value=2500000.0,
            status=AccountStatus.ACTIVE,
            health=Health.GREEN,
            delivery_head_id=studio_head.id,
        )
        acc2 = Account(
            name="Global Tech Solutions",
            industry="Technology",
            country="United Kingdom",
            business_unit="Digital",
            contract_value=1800000.0,
            status=AccountStatus.ACTIVE,
            health=Health.GREEN,
            delivery_head_id=studio_head.id,
        )
        acc3 = Account(
            name="Meridian Health",
            industry="Healthcare",
            country="Canada",
            business_unit="Health Systems",
            contract_value=3200000.0,
            status=AccountStatus.ACTIVE,
            health=Health.AMBER,
            delivery_head_id=studio_head.id,
        )
        db.add_all([acc1, acc2, acc3])
        db.flush()

        # 6. Projects
        proj1 = Project(
            account_id=acc1.id,
            name="Retail Banking Portal",
            phase=ProjectPhase.DEVELOPMENT,
            health=Health.GREEN,
            risk=RiskLevel.LOW,
            client="Acme Corp",
            budget_used=1.2,
            budget_total=2.5,
            program_manager_id=pm1.id,
            project_manager_id=proj_m1.id,
            team_lead_id=architect.id,
            tech_stack="React,Node.js,PostgreSQL",
            sprint_number=4,
            description="Modernizing online retail banking portal and customer dashboard.",
            start_date=date(2024, 1, 15),
            completion_percent=65,
        )
        proj2 = Project(
            account_id=acc2.id,
            name="Fleet Dispatch Engine",
            phase=ProjectPhase.BETA_TESTING,
            health=Health.GREEN,
            risk=RiskLevel.MEDIUM,
            client="Global Tech Solutions",
            budget_used=0.9,
            budget_total=1.8,
            program_manager_id=pm2.id,
            project_manager_id=proj_m2.id,
            team_lead_id=architect.id,
            tech_stack="Python,FastAPI,Redis,Docker",
            sprint_number=6,
            description="Real-time vehicle dispatch engine and route optimization service.",
            start_date=date(2024, 2, 1),
            completion_percent=80,
        )
        proj3 = Project(
            account_id=acc3.id,
            name="Patient Records Gateway",
            phase=ProjectPhase.PLANNING,
            health=Health.AMBER,
            risk=RiskLevel.HIGH,
            client="Meridian Health",
            budget_used=0.4,
            budget_total=3.2,
            program_manager_id=pm3.id,
            project_manager_id=proj_m3.id,
            team_lead_id=architect.id,
            tech_stack="Java,Spring Boot,AWS,FHIR",
            sprint_number=2,
            description="HIPAA-compliant EHR gateway and patient health record synchronization.",
            start_date=date(2024, 3, 10),
            completion_percent=25,
        )
        db.add_all([proj1, proj2, proj3])
        db.flush()

        # 7. Resource Allocations
        alloc1 = ResourceAllocation(
            project_id=proj1.id,
            employee_id=sr_dev.id,
            allocation_role=AllocationRole.DEVELOPER,
            allocation_percent=100,
            start_date=date(2024, 1, 15),
            created_by_id=studio_head.id,
        )
        alloc2 = ResourceAllocation(
            project_id=proj1.id,
            employee_id=dev.id,
            allocation_role=AllocationRole.DEVELOPER,
            allocation_percent=100,
            start_date=date(2024, 1, 15),
            created_by_id=studio_head.id,
        )
        alloc3 = ResourceAllocation(
            project_id=proj1.id,
            employee_id=qa.id,
            allocation_role=AllocationRole.QA,
            allocation_percent=100,
            start_date=date(2024, 1, 15),
            created_by_id=studio_head.id,
        )
        alloc4 = ResourceAllocation(
            project_id=proj2.id,
            employee_id=devops.id,
            allocation_role=AllocationRole.DEVOPS,
            allocation_percent=100,
            start_date=date(2024, 2, 1),
            created_by_id=studio_head.id,
        )
        alloc5 = ResourceAllocation(
            project_id=proj3.id,
            employee_id=intern.id,
            allocation_role=AllocationRole.INTERN,
            allocation_percent=100,
            start_date=date(2024, 3, 10),
            created_by_id=studio_head.id,
        )
        db.add_all([alloc1, alloc2, alloc3, alloc4, alloc5])
        
        # Commit all records.
        db.commit()

if __name__ == "__main__":
    seed()

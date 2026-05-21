import random
from faker import Faker
import graph

fake = Faker()

SKILLS = [
    ("Python", "language"),
    ("Java", "language"),
    ("Go", "language"),
    ("TypeScript", "language"),
    ("Rust", "language"),
    ("AWS", "platform"),
    ("Kubernetes", "platform"),
    ("Docker", "platform"),
    ("Terraform", "platform"),
    ("Redis", "platform"),
    ("Kafka", "platform"),
    ("PostgreSQL", "platform"),
    ("MongoDB", "platform"),
    ("Spark", "platform"),
    ("GraphQL", "platform"),
    ("React", "framework"),
    ("Spring Boot", "framework"),
    ("FastAPI", "framework"),
    ("iOS", "framework"),
    ("Fintech Domain", "domain"),
    ("Healthcare Domain", "domain"),
    ("ML Ops", "domain"),
    ("Data Engineering", "domain"),
    ("DevOps", "domain"),
    ("Cybersecurity", "domain"),
]

CLIENTS = [
    ("PayEdge", "fintech", "large"),
    ("LoanStream", "fintech", "medium"),
    ("HealthBridge", "healthcare", "large"),
    ("RetailCore", "retail", "large"),
    ("CloudNine Logistics", "logistics", "medium"),
    ("DataPulse", "analytics", "small"),
    ("SecureNet", "cybersecurity", "medium"),
    ("AutoDrive", "automotive", "large"),
]

TEAMS = [
    ("Platform Engineering", "London", "Alice Chen"),
    ("Data Engineering", "Bangalore", "Raj Patel"),
    ("Product Engineering", "New York", "Marcus Williams"),
    ("Infrastructure", "Berlin", "Lena Schmidt"),
    ("Mobile", "Sydney", "James Liu"),
    ("Security", "Singapore", "Priya Nair"),
]

PROJECTS = [
    ("Payment Gateway V2", "completed", "fintech", "Real-time payment processing with Kafka and AWS"),
    ("Fraud Detection Platform", "active", "fintech", "ML-based fraud detection for card transactions"),
    ("Loan Origination System", "active", "fintech", "Digital loan application and approval workflow"),
    ("HealthRecord API", "completed", "healthcare", "FHIR-compliant patient record API"),
    ("Claims Automation", "active", "healthcare", "Automated insurance claims processing"),
    ("Inventory Optimizer", "active", "retail", "Real-time inventory management with ML"),
    ("Supply Chain Tracker", "completed", "logistics", "End-to-end shipment tracking platform"),
    ("Analytics Platform", "active", "analytics", "Self-serve analytics on Spark"),
    ("Identity Platform", "completed", "cybersecurity", "Zero-trust identity and access management"),
    ("Connected Vehicles API", "active", "automotive", "Real-time telemetry API for connected cars"),
    ("Data Mesh Framework", "planning", "analytics", "Federated data mesh implementation"),
    ("API Gateway Migration", "completed", "logistics", "Migration from monolith to microservices"),
    ("Compliance Dashboard", "active", "fintech", "Regulatory reporting and compliance tracking"),
    ("Mobile Banking App", "active", "fintech", "Consumer mobile banking application"),
    ("DevOps Transformation", "completed", "cybersecurity", "CI/CD and platform modernisation"),
]

PROJECT_SKILLS = {
    "Payment Gateway V2": ["Kafka", "Java", "AWS", "PostgreSQL"],
    "Fraud Detection Platform": ["Python", "Kafka", "AWS", "ML Ops"],
    "Loan Origination System": ["Java", "Spring Boot", "PostgreSQL", "Kubernetes"],
    "HealthRecord API": ["Python", "FastAPI", "PostgreSQL", "Kubernetes"],
    "Claims Automation": ["Python", "Spark", "AWS", "ML Ops"],
    "Inventory Optimizer": ["Python", "Kafka", "Redis", "React"],
    "Supply Chain Tracker": ["Go", "Kafka", "AWS", "Docker"],
    "Analytics Platform": ["Python", "Spark", "AWS", "Data Engineering"],
    "Identity Platform": ["Go", "Kubernetes", "AWS", "Cybersecurity"],
    "Connected Vehicles API": ["Go", "Kafka", "AWS", "Docker"],
    "Data Mesh Framework": ["Python", "Spark", "Kafka", "Data Engineering"],
    "API Gateway Migration": ["Go", "Kubernetes", "Docker", "Terraform"],
    "Compliance Dashboard": ["Python", "React", "AWS", "Fintech Domain"],
    "Mobile Banking App": ["React", "TypeScript", "AWS", "Fintech Domain"],
    "DevOps Transformation": ["Terraform", "Kubernetes", "Docker", "AWS"],
}

TEAM_PROJECTS = {
    "Platform Engineering": ["Payment Gateway V2", "API Gateway Migration", "Identity Platform"],
    "Data Engineering": ["Analytics Platform", "Data Mesh Framework", "Fraud Detection Platform"],
    "Product Engineering": ["Mobile Banking App", "Loan Origination System", "Compliance Dashboard"],
    "Infrastructure": ["DevOps Transformation", "Identity Platform", "Connected Vehicles API"],
    "Mobile": ["Mobile Banking App", "Connected Vehicles API"],
    "Security": ["Identity Platform", "Fraud Detection Platform", "Compliance Dashboard"],
}

ROLES = [
    "Software Engineer",
    "Senior Engineer",
    "Staff Engineer",
    "Tech Lead",
    "Principal Engineer",
]
SENIORITY = ["junior", "mid", "senior", "staff", "principal"]
LOCATIONS = [
    "London", "Bangalore", "New York", "Berlin",
    "Sydney", "Singapore", "Toronto", "Amsterdam",
]
PROFICIENCY = ["beginner", "intermediate", "expert"]

# Fintech projects where demo people will have worked
DEMO_FINTECH_PROJECTS = [
    "Payment Gateway V2",
    "Fraud Detection Platform",
    "Mobile Banking App",
    "Compliance Dashboard",
    "Loan Origination System",
    "Payment Gateway V2",
]


def _skill_id(name: str) -> str:
    return name.lower().replace(" ", "_")


def _node_id(name: str) -> str:
    return name.lower().replace(" ", "_").replace("-", "_").replace("/", "_")


def run_ingest() -> dict:
    graph.run_query("MATCH (n) DETACH DELETE n")
    graph.create_constraints()

    skill_ids = {}
    for name, category in SKILLS:
        sid = _skill_id(name)
        graph.run_query(
            "MERGE (s:Skill {id: $id}) SET s.name = $name, s.category = $category",
            {"id": sid, "name": name, "category": category},
        )
        skill_ids[name] = sid

    client_ids = {}
    for name, industry, size in CLIENTS:
        cid = _node_id(name)
        graph.run_query(
            "MERGE (c:Client {id: $id}) SET c.name = $name, c.industry = $industry, c.size = $size",
            {"id": cid, "name": name, "industry": industry, "size": size},
        )
        client_ids[name] = cid

    team_ids = {}
    for name, location, lead in TEAMS:
        tid = _node_id(name)
        graph.run_query(
            "MERGE (t:Team {id: $id}) SET t.name = $name, t.location = $location, t.lead = $lead",
            {"id": tid, "name": name, "location": location, "lead": lead},
        )
        team_ids[name] = tid

    project_ids = {}
    industry_clients = {}
    for _, ind, _ in CLIENTS:
        industry_clients.setdefault(ind, [])
    for cname, ind, _ in CLIENTS:
        industry_clients[ind].append(cname)

    for name, status, industry, description in PROJECTS:
        pid = _node_id(name)
        start = fake.date_between(start_date="-3y", end_date="-1y").isoformat()
        end = (
            fake.date_between(start_date="-1y", end_date="today").isoformat()
            if status == "completed"
            else None
        )
        graph.run_query(
            """MERGE (p:Project {id: $id})
               SET p.name = $name, p.status = $status,
                   p.start_date = $start, p.end_date = $end, p.description = $desc""",
            {"id": pid, "name": name, "status": status, "start": start, "end": end, "desc": description},
        )
        project_ids[name] = pid

        clients_for_industry = industry_clients.get(industry) or [CLIENTS[0][0]]
        chosen_client = random.choice(clients_for_industry)
        graph.run_query(
            "MATCH (p:Project {id: $pid}), (c:Client {id: $cid}) MERGE (p)-[:FOR_CLIENT]->(c)",
            {"pid": pid, "cid": client_ids[chosen_client]},
        )

    for proj_name, skills in PROJECT_SKILLS.items():
        for skill in skills:
            if skill in skill_ids:
                graph.run_query(
                    "MATCH (p:Project {id: $pid}), (s:Skill {id: $sid}) MERGE (p)-[:USED_SKILL]->(s)",
                    {"pid": project_ids[proj_name], "sid": skill_ids[skill]},
                )

    for team_name, projects in TEAM_PROJECTS.items():
        for proj_name in projects:
            graph.run_query(
                "MATCH (t:Team {id: $tid}), (p:Project {id: $pid}) MERGE (t)-[:DELIVERED]->(p)",
                {"tid": team_ids[team_name], "pid": project_ids[proj_name]},
            )

    team_names = list(team_ids.keys())
    all_skill_names = list(skill_ids.keys())
    all_project_names = list(project_ids.keys())

    # 6 guaranteed demo-ready people: available + AWS + Kafka + fintech project
    for i in range(6):
        pid = f"person_{i}"
        name = fake.name()
        role = random.choice(["Senior Engineer", "Staff Engineer", "Tech Lead"])
        seniority = random.choice(["senior", "staff"])
        team = team_names[i % len(team_names)]

        graph.run_query(
            """MERGE (p:Person {id: $id})
               SET p.name = $name, p.role = $role, p.seniority = $seniority,
                   p.availability = true, p.location = $loc""",
            {"id": pid, "name": name, "role": role, "seniority": seniority,
             "loc": random.choice(LOCATIONS)},
        )

        for skill in ["AWS", "Kafka", "Python", "Docker"]:
            graph.run_query(
                """MATCH (p:Person {id: $pid}), (s:Skill {id: $sid})
                   MERGE (p)-[:HAS_SKILL {proficiency: $prof, years: $years}]->(s)""",
                {"pid": pid, "sid": skill_ids[skill],
                 "prof": "expert" if skill in ("AWS", "Kafka") else "intermediate",
                 "years": random.randint(3, 8)},
            )

        fintech_proj = DEMO_FINTECH_PROJECTS[i]
        graph.run_query(
            """MATCH (p:Person {id: $pid}), (proj:Project {id: $projid})
               MERGE (p)-[:WORKED_ON {role: $role, from: $from, to: $to}]->(proj)""",
            {"pid": pid, "projid": project_ids[fintech_proj], "role": role,
             "from": fake.date_between(start_date="-3y", end_date="-1y").isoformat(),
             "to": fake.date_between(start_date="-1y", end_date="today").isoformat()},
        )

        graph.run_query(
            "MATCH (p:Person {id: $pid}), (t:Team {id: $tid}) MERGE (p)-[:MEMBER_OF]->(t)",
            {"pid": pid, "tid": team_ids[team]},
        )

    # 44 random people
    for i in range(6, 50):
        pid = f"person_{i}"
        name = fake.name()
        role = random.choice(ROLES)
        seniority = random.choice(SENIORITY)

        graph.run_query(
            """MERGE (p:Person {id: $id})
               SET p.name = $name, p.role = $role, p.seniority = $seniority,
                   p.availability = $avail, p.location = $loc""",
            {"id": pid, "name": name, "role": role, "seniority": seniority,
             "avail": random.random() > 0.6,
             "loc": random.choice(LOCATIONS)},
        )

        for skill in random.sample(all_skill_names, random.randint(3, 7)):
            graph.run_query(
                """MATCH (p:Person {id: $pid}), (s:Skill {id: $sid})
                   MERGE (p)-[:HAS_SKILL {proficiency: $prof, years: $years}]->(s)""",
                {"pid": pid, "sid": skill_ids[skill],
                 "prof": random.choice(PROFICIENCY),
                 "years": random.randint(1, 8)},
            )

        for proj_name in random.sample(all_project_names, random.randint(1, 3)):
            graph.run_query(
                """MATCH (p:Person {id: $pid}), (proj:Project {id: $projid})
                   MERGE (p)-[:WORKED_ON {role: $role, from: $from, to: $to}]->(proj)""",
                {"pid": pid, "projid": project_ids[proj_name], "role": role,
                 "from": fake.date_between(start_date="-3y", end_date="-1y").isoformat(),
                 "to": fake.date_between(start_date="-1y", end_date="today").isoformat()},
            )

        graph.run_query(
            "MATCH (p:Person {id: $pid}), (t:Team {id: $tid}) MERGE (p)-[:MEMBER_OF]->(t)",
            {"pid": pid, "tid": team_ids[random.choice(team_names)]},
        )

    node_result = graph.run_query("MATCH (n) RETURN count(n) as count")
    rel_result = graph.run_query("MATCH ()-[r]->() RETURN count(r) as count")

    return {
        "nodes": node_result[0]["count"] if node_result else 0,
        "relationships": rel_result[0]["count"] if rel_result else 0,
    }

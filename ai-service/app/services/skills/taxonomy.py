"""Canonical Skill Taxonomy and Alias Definitions."""

from typing import Dict, List, Optional

# Canonical skill metadata: canonicalName -> { name, category }
SKILL_TAXONOMY: Dict[str, Dict[str, str]] = {
    # Programming Languages
    "python": {"name": "Python", "category": "programming_language"},
    "javascript": {"name": "JavaScript", "category": "programming_language"},
    "typescript": {"name": "TypeScript", "category": "programming_language"},
    "java": {"name": "Java", "category": "programming_language"},
    "c++": {"name": "C++", "category": "programming_language"},
    "c#": {"name": "C#", "category": "programming_language"},
    "c": {"name": "C", "category": "programming_language"},
    "go": {"name": "Go", "category": "programming_language"},
    "rust": {"name": "Rust", "category": "programming_language"},
    "ruby": {"name": "Ruby", "category": "programming_language"},
    "php": {"name": "PHP", "category": "programming_language"},
    "swift": {"name": "Swift", "category": "programming_language"},
    "kotlin": {"name": "Kotlin", "category": "programming_language"},
    "scala": {"name": "Scala", "category": "programming_language"},
    "r": {"name": "R", "category": "programming_language"},
    "dart": {"name": "Dart", "category": "programming_language"},
    "sql": {"name": "SQL", "category": "programming_language"},
    "html": {"name": "HTML", "category": "programming_language"},
    "css": {"name": "CSS", "category": "programming_language"},
    "bash": {"name": "Bash", "category": "programming_language"},

    # Frontend
    "react": {"name": "React", "category": "frontend"},
    "next.js": {"name": "Next.js", "category": "frontend"},
    "vue": {"name": "Vue.js", "category": "frontend"},
    "angular": {"name": "Angular", "category": "frontend"},
    "svelte": {"name": "Svelte", "category": "frontend"},
    "tailwind_css": {"name": "Tailwind CSS", "category": "frontend"},
    "bootstrap": {"name": "Bootstrap", "category": "frontend"},
    "redux": {"name": "Redux", "category": "frontend"},
    "vite": {"name": "Vite", "category": "frontend"},
    "webpack": {"name": "Webpack", "category": "frontend"},
    "sass": {"name": "Sass", "category": "frontend"},

    # Backend
    "node.js": {"name": "Node.js", "category": "backend"},
    "express": {"name": "Express.js", "category": "backend"},
    "fastapi": {"name": "FastAPI", "category": "backend"},
    "django": {"name": "Django", "category": "backend"},
    "flask": {"name": "Flask", "category": "backend"},
    "spring_boot": {"name": "Spring Boot", "category": "backend"},
    "nestjs": {"name": "NestJS", "category": "backend"},
    "asp.net": {"name": "ASP.NET", "category": "backend"},
    "laravel": {"name": "Laravel", "category": "backend"},
    "rails": {"name": "Ruby on Rails", "category": "backend"},
    "graphql": {"name": "GraphQL", "category": "backend"},
    "rest_api": {"name": "REST API", "category": "backend"},
    "grpc": {"name": "gRPC", "category": "backend"},
    "microservices": {"name": "Microservices", "category": "backend"},
    "websockets": {"name": "WebSockets", "category": "backend"},

    # Database
    "mongodb": {"name": "MongoDB", "category": "database"},
    "postgresql": {"name": "PostgreSQL", "category": "database"},
    "mysql": {"name": "MySQL", "category": "database"},
    "redis": {"name": "Redis", "category": "database"},
    "sqlite": {"name": "SQLite", "category": "database"},
    "elasticsearch": {"name": "Elasticsearch", "category": "database"},
    "dynamodb": {"name": "DynamoDB", "category": "database"},
    "cassandra": {"name": "Cassandra", "category": "database"},
    "supabase": {"name": "Supabase", "category": "database"},
    "firebase": {"name": "Firebase", "category": "database"},
    "prisma": {"name": "Prisma", "category": "database"},
    "mongoose": {"name": "Mongoose", "category": "database"},

    # Cloud & DevOps
    "aws": {"name": "AWS", "category": "cloud"},
    "azure": {"name": "Azure", "category": "cloud"},
    "gcp": {"name": "Google Cloud Platform", "category": "cloud"},
    "docker": {"name": "Docker", "category": "devops"},
    "kubernetes": {"name": "Kubernetes", "category": "devops"},
    "terraform": {"name": "Terraform", "category": "devops"},
    "ci_cd": {"name": "CI/CD", "category": "devops"},
    "github_actions": {"name": "GitHub Actions", "category": "devops"},
    "jenkins": {"name": "Jenkins", "category": "devops"},
    "linux": {"name": "Linux", "category": "devops"},
    "nginx": {"name": "Nginx", "category": "devops"},

    # AI & Machine Learning
    "machine_learning": {"name": "Machine Learning", "category": "ai_ml"},
    "deep_learning": {"name": "Deep Learning", "category": "ai_ml"},
    "pytorch": {"name": "PyTorch", "category": "ai_ml"},
    "tensorflow": {"name": "TensorFlow", "category": "ai_ml"},
    "scikit_learn": {"name": "Scikit-Learn", "category": "ai_ml"},
    "nlp": {"name": "Natural Language Processing", "category": "ai_ml"},
    "computer_vision": {"name": "Computer Vision", "category": "ai_ml"},
    "llm": {"name": "Large Language Models", "category": "ai_ml"},
    "langchain": {"name": "LangChain", "category": "ai_ml"},
    "openai": {"name": "OpenAI API", "category": "ai_ml"},
    "gemini": {"name": "Gemini API", "category": "ai_ml"},

    # Data
    "data_analysis": {"name": "Data Analysis", "category": "data"},
    "pandas": {"name": "Pandas", "category": "data"},
    "numpy": {"name": "NumPy", "category": "data"},
    "apache_spark": {"name": "Apache Spark", "category": "data"},
    "tableau": {"name": "Tableau", "category": "data"},
    "power_bi": {"name": "Power BI", "category": "data"},

    # Cybersecurity
    "oauth": {"name": "OAuth", "category": "cybersecurity"},
    "jwt": {"name": "JWT", "category": "cybersecurity"},
    "rbac": {"name": "RBAC", "category": "cybersecurity"},
    "cryptography": {"name": "Cryptography", "category": "cybersecurity"},

    # Mobile
    "react_native": {"name": "React Native", "category": "mobile"},
    "flutter": {"name": "Flutter", "category": "mobile"},
    "android": {"name": "Android", "category": "mobile"},
    "ios": {"name": "iOS", "category": "mobile"},

    # Testing
    "jest": {"name": "Jest", "category": "testing"},
    "pytest": {"name": "Pytest", "category": "testing"},
    "vitest": {"name": "Vitest", "category": "testing"},
    "cypress": {"name": "Cypress", "category": "testing"},
    "playwright": {"name": "Playwright", "category": "testing"},
    "mocha": {"name": "Mocha", "category": "testing"},
    "junit": {"name": "JUnit", "category": "testing"},

    # Tools
    "git": {"name": "Git", "category": "tools"},
    "github": {"name": "GitHub", "category": "tools"},
    "gitlab": {"name": "GitLab", "category": "tools"},
    "postman": {"name": "Postman", "category": "tools"},
    "jira": {"name": "Jira", "category": "tools"},
    "figma": {"name": "Figma", "category": "tools"},

    # Other
    "agile": {"name": "Agile", "category": "other"},
    "scrum": {"name": "Scrum", "category": "other"},
    "system_design": {"name": "System Design", "category": "other"},
}

# Aliases mapping raw token/string -> canonicalName key
SKILL_ALIASES: Dict[str, str] = {
    # React
    "react": "react",
    "react.js": "react",
    "reactjs": "react",
    "react js": "react",
    # Next.js
    "next": "next.js",
    "next.js": "next.js",
    "nextjs": "next.js",
    "next js": "next.js",
    # Vue
    "vue": "vue",
    "vue.js": "vue",
    "vuejs": "vue",
    "vue js": "vue",
    # Angular
    "angular": "angular",
    "angularjs": "angular",
    "angular.js": "angular",
    # Node.js
    "node": "node.js",
    "node.js": "node.js",
    "nodejs": "node.js",
    "node js": "node.js",
    # Express
    "express": "express",
    "express.js": "express",
    "expressjs": "express",
    # Python
    "py": "python",
    "python": "python",
    "python3": "python",
    # JavaScript
    "js": "javascript",
    "javascript": "javascript",
    "ecmascript": "javascript",
    # TypeScript
    "ts": "typescript",
    "typescript": "typescript",
    # C++
    "c++": "c++",
    "cpp": "c++",
    # C#
    "c#": "c#",
    "csharp": "c#",
    # Golang
    "golang": "go",
    "go": "go",
    # MongoDB
    "mongo": "mongodb",
    "mongodb": "mongodb",
    # PostgreSQL
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "pgsql": "postgresql",
    # MySQL
    "mysql": "mysql",
    # Redis
    "redis": "redis",
    # SQLite
    "sqlite": "sqlite",
    "sqlite3": "sqlite",
    # AWS
    "aws": "aws",
    "amazon web services": "aws",
    # GCP
    "gcp": "gcp",
    "google cloud": "gcp",
    "google cloud platform": "gcp",
    # Azure
    "azure": "azure",
    "microsoft azure": "azure",
    # Docker
    "docker": "docker",
    # Kubernetes
    "k8s": "kubernetes",
    "kubernetes": "kubernetes",
    # Tailwind CSS
    "tailwind": "tailwind_css",
    "tailwindcss": "tailwind_css",
    "tailwind css": "tailwind_css",
    # Bootstrap
    "bootstrap": "bootstrap",
    # Spring Boot
    "spring": "spring_boot",
    "spring boot": "spring_boot",
    "springboot": "spring_boot",
    # FastAPI
    "fastapi": "fastapi",
    "fast api": "fastapi",
    # Django
    "django": "django",
    # Flask
    "flask": "flask",
    # NestJS
    "nestjs": "nestjs",
    "nest.js": "nestjs",
    # GraphQL
    "graphql": "graphql",
    # REST API
    "rest": "rest_api",
    "rest api": "rest_api",
    "restful": "rest_api",
    "restful api": "rest_api",
    # PyTorch
    "pytorch": "pytorch",
    "torch": "pytorch",
    # TensorFlow
    "tensorflow": "tensorflow",
    "tf": "tensorflow",
    # Scikit-Learn
    "scikit-learn": "scikit_learn",
    "scikit learn": "scikit_learn",
    "sklearn": "scikit_learn",
    # React Native
    "react-native": "react_native",
    "react native": "react_native",
    # Flutter
    "flutter": "flutter",
    # CI/CD
    "ci/cd": "ci_cd",
    "ci-cd": "ci_cd",
    "cicd": "ci_cd",
    # GitHub Actions
    "github actions": "github_actions",
    "github-actions": "github_actions",
    # Machine Learning
    "ml": "machine_learning",
    "machine learning": "machine_learning",
    # Deep Learning
    "dl": "deep_learning",
    "deep learning": "deep_learning",
    # NLP
    "nlp": "nlp",
    "natural language processing": "nlp",
    # Git
    "git": "git",
    "github": "github",
    # Postman
    "postman": "postman",
    # JWT
    "jwt": "jwt",
    # OAuth
    "oauth": "oauth",
    "oauth2": "oauth",
    # RBAC
    "rbac": "rbac",
    # Pytest
    "pytest": "pytest",
    # Jest
    "jest": "jest",
    # Vitest
    "vitest": "vitest",
    # Linux
    "linux": "linux",
    # Nginx
    "nginx": "nginx",
}

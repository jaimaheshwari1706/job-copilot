export interface CanonicalSkillSeed {
  name: string;
  aliases: string[];
  category: string;
  relatedSkills?: string[];
}

/**
 * Seed dictionary for the canonical skill taxonomy (Phase 0 amendment #6).
 * Not exhaustive — unrecognized skills pass through the normalizer
 * unchanged (title-cased) rather than being dropped, since a resume or
 * job listing containing a skill outside this dictionary is still valid
 * data, just not yet canonicalized.
 */
export const CANONICAL_SKILLS_SEED: CanonicalSkillSeed[] = [
  { name: "JavaScript", aliases: ["js", "javascript", "ecmascript"], category: "language" },
  { name: "TypeScript", aliases: ["ts", "typescript"], category: "language" },
  { name: "Python", aliases: ["python", "py"], category: "language" },
  { name: "Go", aliases: ["go", "golang"], category: "language" },
  { name: "SQL", aliases: ["sql"], category: "language" },

  {
    name: "React",
    aliases: ["react", "react.js", "reactjs"],
    category: "frontend",
    relatedSkills: ["TypeScript", "JavaScript"],
  },
  { name: "React Native", aliases: ["react native", "reactnative"], category: "mobile" },
  { name: "Next.js", aliases: ["next.js", "nextjs", "next js"], category: "frontend" },
  { name: "CSS", aliases: ["css", "css3"], category: "frontend" },
  { name: "HTML", aliases: ["html", "html5"], category: "frontend" },
  { name: "Framer Motion", aliases: ["framer motion", "framer-motion"], category: "frontend" },
  { name: "Accessibility", aliases: ["accessibility", "a11y"], category: "frontend" },
  { name: "GraphQL", aliases: ["graphql", "graph ql"], category: "api" },

  {
    name: "Node.js",
    aliases: ["node", "node.js", "nodejs"],
    category: "backend",
    relatedSkills: ["JavaScript", "TypeScript", "Express"],
  },
  { name: "Express", aliases: ["express", "express.js", "expressjs"], category: "backend" },
  { name: "REST APIs", aliases: ["rest", "rest api", "rest apis", "restful"], category: "api" },
  { name: "System Design", aliases: ["system design"], category: "backend" },
  { name: "Distributed Systems", aliases: ["distributed systems"], category: "backend" },

  { name: "MongoDB", aliases: ["mongodb", "mongo"], category: "database" },
  { name: "PostgreSQL", aliases: ["postgresql", "postgres", "psql"], category: "database" },
  { name: "Redis", aliases: ["redis"], category: "database" },

  { name: "Docker", aliases: ["docker"], category: "devops" },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s"], category: "devops" },
  { name: "Terraform", aliases: ["terraform"], category: "devops" },
  { name: "AWS", aliases: ["aws", "amazon web services"], category: "devops" },
  { name: "CI/CD", aliases: ["ci/cd", "cicd", "ci cd"], category: "devops" },
  { name: "Prometheus", aliases: ["prometheus"], category: "devops" },
  { name: "Datadog", aliases: ["datadog"], category: "devops" },
  { name: "BullMQ", aliases: ["bullmq", "bull mq"], category: "devops" },
  { name: "Kafka", aliases: ["kafka"], category: "devops" },

  { name: "Airflow", aliases: ["airflow", "apache airflow"], category: "data" },
  { name: "Spark", aliases: ["spark", "apache spark"], category: "data" },
  { name: "dbt", aliases: ["dbt"], category: "data" },

  { name: "Testing", aliases: ["testing", "test automation"], category: "quality" },
  { name: "Playwright", aliases: ["playwright"], category: "quality" },
  { name: "Cypress", aliases: ["cypress"], category: "quality" },
  { name: "Jest", aliases: ["jest"], category: "quality" },
  { name: "Testing Library", aliases: ["testing library", "@testing-library"], category: "quality" },

  { name: "Engineering Management", aliases: ["engineering management", "eng management"], category: "leadership" },
  { name: "Leadership", aliases: ["leadership"], category: "leadership" },
];

import type { ReactNode } from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import Heading from '@theme/Heading'
import styles from './styles.module.css'

type PackageItem = {
  title: string
  icon: string
  description: ReactNode
  link: string
}

const PackageList: PackageItem[] = [
  {
    title: 'MCP Server',
    icon: '🤖',
    description: (
      <>
        AI-powered revenue cycle management tools for denial triage, cash
        leakage analysis, and coding validation. Integrates with AI assistants
        via Model Context Protocol.
      </>
    ),
    link: '/docs/mcp-server/overview',
  },
  {
    title: 'Database Migrations',
    icon: '🗄️',
    description: (
      <>
        PostgreSQL schema migrations for claims, denials, appeals, and
        analytics. Includes seeded reference data and comprehensive workflow
        tracking.
      </>
    ),
    link: '/docs/migrations/setup',
  },
  {
    title: 'Infrastructure',
    icon: '☁️',
    description: (
      <>
        AWS CDK infrastructure for production deployment. Provisions RDS
        PostgreSQL, VPC networking, and S3 storage with security best practices.
      </>
    ),
    link: '/docs/infrastructure/deployment',
  },
  {
    title: 'Shared Types',
    icon: '📦',
    description: (
      <>
        TypeScript schemas and validation for claims, denials, appeals, and
        policies. Shared across packages with Zod runtime validation.
      </>
    ),
    link: '/docs/shared-types/overview',
  },
]

function PackageCard({ title, icon, description, link }: PackageItem) {
  return (
    <div className={clsx('col col--6')}>
      <Link to={link} className={styles.packageCard}>
        <div className={styles.packageCardInner}>
          <div className={styles.packageIcon}>{icon}</div>
          <Heading as="h3">{title}</Heading>
          <p>{description}</p>
          <div className={styles.packageLink}>View Documentation →</div>
        </div>
      </Link>
    </div>
  )
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="text--center margin-bottom--xl">
          <Heading as="h2">Packages</Heading>
          <p>
            RCM is a monorepo containing multiple packages for healthcare
            revenue cycle management
          </p>
        </div>
        <div className="row">
          {PackageList.map((props, idx) => (
            <PackageCard key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  )
}

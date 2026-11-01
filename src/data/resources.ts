import type { Resource, ResourceType } from '../types'
import { subjects } from './subjects'

/**
 * RESOURCE CATALOG
 * ----------------
 * To replace the demo content with real notes:
 *   1. Drop your PDF into /public/pdfs/<file>.pdf
 *   2. Add (or edit) a row below. `file` is the PDF name without extension.
 *   3. `subjectId` must exist in subjects.ts. Subject name and semester are derived from it.
 *
 * All sample PDFs are self-created demo material (see /tools). PYQ-type entries are
 * model practice papers, NOT official university papers.
 */
interface ResourceSeed {
  id: string
  file: string
  title: string
  description: string
  subjectId: string
  unit: string
  topic: string
  type: ResourceType
  year?: number
  tags: string[]
  createdAt: string
  /** Curated "popular" flag (no analytics backend in the static MVP). */
  popular?: boolean
}

const seeds: ResourceSeed[] = [
  // ---------------- DBMS
  {
    id: 'dbms-er-model-relational',
    file: 'dbms-er-model-relational',
    title: 'ER Model and Relational Model',
    description: 'Entities, attributes, relationships, ER-to-table mapping, keys and relational algebra with a worked enrolment example.',
    subjectId: 'dbms', unit: 'Unit 1', topic: 'Data Modelling', type: 'notes',
    tags: ['er diagram', 'keys', 'relational model', 'schema'], createdAt: '2026-10-20', popular: true,
  },
  {
    id: 'dbms-sql-normalization',
    file: 'dbms-sql-normalization',
    title: 'SQL Essentials and Normalization',
    description: 'SELECT, joins, GROUP BY/HAVING, functional dependencies, 1NF to BCNF, and ACID transactions with isolation levels.',
    subjectId: 'dbms', unit: 'Units 2-3', topic: 'SQL and Normalization', type: 'notes',
    tags: ['sql', 'joins', 'normalization', 'acid', 'bcnf'], createdAt: '2026-10-24', popular: true,
  },
  {
    id: 'dbms-practice-paper',
    file: 'dbms-practice-paper',
    title: 'DBMS Model Practice Paper (2025)',
    description: 'A 50-mark self-created practice paper with short, medium and long questions plus answer hints. Demo material, not an official paper.',
    subjectId: 'dbms', unit: 'All units', topic: 'Exam Practice', type: 'pyq', year: 2025,
    tags: ['practice paper', 'model paper', 'sql', 'normalization'], createdAt: '2026-10-26',
  },
  {
    id: 'dbms-sql-cheatsheet',
    file: 'dbms-sql-cheatsheet',
    title: 'SQL Quick Reference',
    description: 'One-page cheat sheet: query skeleton, aggregates, DDL/DML, constraints and NULL handling.',
    subjectId: 'dbms', unit: 'Unit 2', topic: 'SQL', type: 'reference',
    tags: ['sql', 'cheat sheet', 'syntax'], createdAt: '2026-10-28', popular: true,
  },
  // ---------------- DSA
  {
    id: 'dsa-arrays-linked-lists',
    file: 'dsa-arrays-linked-lists',
    title: 'Complexity, Arrays, Stacks and Linked Lists',
    description: 'Big-O basics, array operations, singly and doubly linked lists, stacks, queues and postfix evaluation with code.',
    subjectId: 'dsa', unit: 'Unit 1', topic: 'Linear Data Structures', type: 'notes',
    tags: ['big-o', 'linked list', 'stack', 'queue', 'arrays'], createdAt: '2026-10-05', popular: true,
  },
  {
    id: 'dsa-trees-graphs',
    file: 'dsa-trees-graphs',
    title: 'Trees, Graphs, Sorting and Searching',
    description: 'BSTs and traversals, heaps, graph representations, BFS/DFS, Dijkstra, MST and the major sorting algorithms.',
    subjectId: 'dsa', unit: 'Units 2-3', topic: 'Non-linear Structures', type: 'notes',
    tags: ['bst', 'heap', 'graph', 'bfs', 'dijkstra', 'sorting'], createdAt: '2026-10-12',
  },
  {
    id: 'dsa-practice-paper',
    file: 'dsa-practice-paper',
    title: 'DSA Model Practice Paper (2024)',
    description: 'Self-created 50-mark practice paper covering complexity, expression conversion, BST operations and Dijkstra. Demo material.',
    subjectId: 'dsa', unit: 'All units', topic: 'Exam Practice', type: 'pyq', year: 2024,
    tags: ['practice paper', 'bst', 'dijkstra', 'quick sort'], createdAt: '2026-10-15',
  },
  {
    id: 'dsa-complexity-cheatsheet',
    file: 'dsa-complexity-cheatsheet',
    title: 'Complexity Cheat Sheet',
    description: 'Time complexity tables for common data structures, sorting algorithms and graph algorithms.',
    subjectId: 'dsa', unit: 'All units', topic: 'Complexity', type: 'reference',
    tags: ['big-o', 'cheat sheet', 'sorting'], createdAt: '2026-10-16', popular: true,
  },
  // ---------------- OS
  {
    id: 'os-processes-scheduling',
    file: 'os-processes-scheduling',
    title: 'Processes, Threads and CPU Scheduling',
    description: 'Process states, PCB, threads, scheduling criteria, FCFS/SJF/RR/priority with a worked example and synchronization basics.',
    subjectId: 'os', unit: 'Units 1-2', topic: 'Process Management', type: 'notes',
    tags: ['process', 'thread', 'scheduling', 'semaphore', 'round robin'], createdAt: '2026-10-08', popular: true,
  },
  {
    id: 'os-memory-deadlocks',
    file: 'os-memory-deadlocks',
    title: 'Memory Management, Virtual Memory and Deadlocks',
    description: 'Paging, TLB, demand paging, FIFO/LRU/optimal replacement, Coffman conditions and the Banker\'s algorithm.',
    subjectId: 'os', unit: 'Unit 3', topic: 'Memory and Deadlocks', type: 'notes',
    tags: ['paging', 'virtual memory', 'deadlock', 'banker', 'lru'], createdAt: '2026-10-14',
  },
  {
    id: 'os-practice-paper',
    file: 'os-practice-paper',
    title: 'Operating Systems Model Practice Paper (2025)',
    description: 'Self-created practice paper with scheduling and page-replacement numericals and answer hints. Demo material.',
    subjectId: 'os', unit: 'All units', topic: 'Exam Practice', type: 'pyq', year: 2025,
    tags: ['practice paper', 'scheduling', 'page replacement'], createdAt: '2026-10-18',
  },
  // ---------------- CN
  {
    id: 'cn-layered-models',
    file: 'cn-layered-models',
    title: 'Network Models, Data Link and IP Addressing',
    description: 'OSI vs TCP/IP layers, framing, flow control, switching, IPv4 addressing, CIDR subnetting and NAT.',
    subjectId: 'cn', unit: 'Units 1-2', topic: 'Layers and Addressing', type: 'notes',
    tags: ['osi', 'tcp/ip', 'subnetting', 'cidr', 'nat'], createdAt: '2026-09-28',
  },
  {
    id: 'cn-transport-routing',
    file: 'cn-transport-routing',
    title: 'Routing, TCP/UDP and Application Protocols',
    description: 'Distance-vector vs link-state routing, TCP handshake and congestion control, DNS, HTTP and email protocols.',
    subjectId: 'cn', unit: 'Units 3-4', topic: 'Transport and Routing', type: 'notes',
    tags: ['tcp', 'udp', 'routing', 'dns', 'congestion control'], createdAt: '2026-10-02', popular: true,
  },
  {
    id: 'cn-practice-paper',
    file: 'cn-practice-paper',
    title: 'Computer Networks Model Practice Paper (2023)',
    description: 'Self-created practice paper on subnetting, TCP, DNS and routing with answer hints. Demo material.',
    subjectId: 'cn', unit: 'All units', topic: 'Exam Practice', type: 'pyq', year: 2023,
    tags: ['practice paper', 'subnetting', 'tcp', 'routing'], createdAt: '2026-10-04',
  },
  {
    id: 'cn-ports-protocols-reference',
    file: 'cn-ports-protocols-reference',
    title: 'Common Ports and Protocols',
    description: 'Well-known port numbers and a subnet-mask lookup table with the usable-host formula.',
    subjectId: 'cn', unit: 'All units', topic: 'Reference', type: 'reference',
    tags: ['ports', 'subnet', 'cheat sheet', 'protocols'], createdAt: '2026-10-06',
  },
  // ---------------- OOP
  {
    id: 'oop-core-principles',
    file: 'oop-core-principles',
    title: 'Classes, Objects and the Four Pillars',
    description: 'Classes, constructors, encapsulation, abstraction, inheritance and polymorphism with a worked Account class.',
    subjectId: 'oop', unit: 'Unit 1', topic: 'Core Concepts', type: 'notes',
    tags: ['class', 'object', 'encapsulation', 'polymorphism'], createdAt: '2026-09-15', popular: true,
  },
  {
    id: 'oop-inheritance-polymorphism',
    file: 'oop-inheritance-polymorphism',
    title: 'Inheritance, Polymorphism, Interfaces and Exceptions',
    description: 'Overloading vs overriding, abstract classes vs interfaces, exception handling and a one-line SOLID summary.',
    subjectId: 'oop', unit: 'Units 2-3', topic: 'Inheritance and Exceptions', type: 'notes',
    tags: ['inheritance', 'interface', 'exceptions', 'solid'], createdAt: '2026-09-20',
  },
  {
    id: 'oop-practice-paper',
    file: 'oop-practice-paper',
    title: 'OOP Model Practice Paper (2024)',
    description: 'Self-created 50-mark practice paper on classes, polymorphism and custom exceptions. Demo material.',
    subjectId: 'oop', unit: 'All units', topic: 'Exam Practice', type: 'pyq', year: 2024,
    tags: ['practice paper', 'polymorphism', 'exceptions'], createdAt: '2026-09-24',
  },
  // ---------------- SE
  {
    id: 'se-sdlc-models',
    file: 'se-sdlc-models',
    title: 'SDLC, Process Models and Requirements',
    description: 'Waterfall, incremental, spiral and Agile/Scrum; functional vs non-functional requirements; essential UML diagrams.',
    subjectId: 'se', unit: 'Units 1-2', topic: 'Process Models', type: 'notes',
    tags: ['sdlc', 'agile', 'scrum', 'uml', 'requirements'], createdAt: '2026-10-09',
  },
  {
    id: 'se-testing-design',
    file: 'se-testing-design',
    title: 'Design, Testing and Maintenance',
    description: 'Cohesion and coupling, testing levels, black-box vs white-box, boundary values and cyclomatic complexity.',
    subjectId: 'se', unit: 'Units 3-4', topic: 'Testing', type: 'notes',
    tags: ['testing', 'coupling', 'cyclomatic complexity', 'maintenance'], createdAt: '2026-10-13',
  },
  {
    id: 'se-practice-paper',
    file: 'se-practice-paper',
    title: 'Software Engineering Model Practice Paper (2025)',
    description: 'Self-created practice paper with Waterfall vs Agile and cyclomatic complexity questions. Demo material.',
    subjectId: 'se', unit: 'All units', topic: 'Exam Practice', type: 'pyq', year: 2025,
    tags: ['practice paper', 'agile', 'testing'], createdAt: '2026-10-17',
  },
  // ---------------- Web
  {
    id: 'web-html-css-basics',
    file: 'web-html-css-basics',
    title: 'HTML5, CSS Layout and Responsive Design',
    description: 'Semantic HTML, the box model, Flexbox vs Grid, mobile-first media queries and an accessibility checklist.',
    subjectId: 'web', unit: 'Unit 1', topic: 'HTML and CSS', type: 'notes',
    tags: ['html', 'css', 'flexbox', 'grid', 'responsive', 'accessibility'], createdAt: '2026-10-21', popular: true,
  },
  {
    id: 'web-javascript-dom',
    file: 'web-javascript-dom',
    title: 'JavaScript, the DOM and Asynchronous Code',
    description: 'ES6 essentials, array methods, DOM events, Promises with async/await, fetch and localStorage.',
    subjectId: 'web', unit: 'Unit 2', topic: 'JavaScript', type: 'notes',
    tags: ['javascript', 'dom', 'async', 'fetch', 'localstorage'], createdAt: '2026-10-27',
  },
  {
    id: 'web-practice-paper',
    file: 'web-practice-paper',
    title: 'Web Development Model Practice Paper (2026)',
    description: 'Self-created practice paper with a responsive Grid layout task and an async fetch exercise. Demo material.',
    subjectId: 'web', unit: 'All units', topic: 'Exam Practice', type: 'pyq', year: 2026,
    tags: ['practice paper', 'css grid', 'javascript'], createdAt: '2026-10-29',
  },
  {
    id: 'web-http-status-reference',
    file: 'web-http-status-reference',
    title: 'HTTP Methods and Status Codes',
    description: 'Quick reference for the common HTTP verbs and status code families.',
    subjectId: 'web', unit: 'Unit 2', topic: 'HTTP', type: 'reference',
    tags: ['http', 'status codes', 'cheat sheet'], createdAt: '2026-10-30',
  },
  // ---------------- AI
  {
    id: 'ai-search-agents',
    file: 'ai-search-agents',
    title: 'Intelligent Agents and Search Strategies',
    description: 'Agent types and environments, BFS/DFS/UCS/IDS, A* with admissible heuristics, minimax and alpha-beta pruning.',
    subjectId: 'ai', unit: 'Unit 1', topic: 'Search', type: 'notes',
    tags: ['agents', 'a*', 'heuristics', 'minimax', 'search'], createdAt: '2026-10-22', popular: true,
  },
  {
    id: 'ai-ml-basics',
    file: 'ai-ml-basics',
    title: 'Knowledge Representation and Machine Learning Basics',
    description: 'Logic, supervised vs unsupervised learning, the training workflow, overfitting and classifier metrics with a worked example.',
    subjectId: 'ai', unit: 'Unit 2', topic: 'Machine Learning', type: 'notes',
    tags: ['machine learning', 'overfitting', 'precision', 'recall', 'logic'], createdAt: '2026-10-25',
  },
  {
    id: 'ai-practice-paper',
    file: 'ai-practice-paper',
    title: 'Artificial Intelligence Model Practice Paper (2026)',
    description: 'Self-created practice paper on A*, heuristics and classifier metrics with answer hints. Demo material.',
    subjectId: 'ai', unit: 'All units', topic: 'Exam Practice', type: 'pyq', year: 2026,
    tags: ['practice paper', 'a*', 'metrics'], createdAt: '2026-10-31',
  },
]

const subjectById = new Map(subjects.map((s) => [s.id, s]))

function buildResource(seed: ResourceSeed): Resource {
  const subject = subjectById.get(seed.subjectId)
  if (!subject) {
    throw new Error(`Resource "${seed.id}" references unknown subject "${seed.subjectId}"`)
  }
  return {
    id: seed.id,
    title: seed.title,
    description: seed.description,
    semester: subject.semester,
    subjectId: subject.id,
    subjectName: subject.name,
    unit: seed.unit,
    topic: seed.topic,
    resourceType: seed.type,
    year: seed.year,
    pdfUrl: `${import.meta.env.BASE_URL}pdfs/${seed.file}.pdf`,
    tags: seed.tags,
    createdAt: seed.createdAt,
  }
}

export const resources: Resource[] = seeds.map(buildResource)

const popularIds = new Set(seeds.filter((s) => s.popular).map((s) => s.id))
export const isPopular = (r: Resource) => popularIds.has(r.id)

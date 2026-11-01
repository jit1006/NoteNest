import type { Subject } from '../types'

/**
 * Subject catalog. Replace/extend this list with real subjects.
 * `id` is referenced by resources (see resources.ts) and the URL (/subjects/:id).
 */
export const subjects: Subject[] = [
  {
    id: 'oop',
    name: 'Object-Oriented Programming',
    shortName: 'OOP',
    semester: 1,
    icon: 'boxes',
    accent: 'violet',
    description:
      'Model real problems with classes and objects. Covers encapsulation, inheritance, polymorphism, interfaces and exception handling with Java-style examples.',
    units: [
      { title: 'Unit 1 - Core OOP Concepts', chapters: ['Classes and objects', 'Constructors', 'Encapsulation', 'Static vs instance members'] },
      { title: 'Unit 2 - Inheritance and Polymorphism', chapters: ['Inheritance types', 'Overloading vs overriding', 'Abstract classes and interfaces'] },
      { title: 'Unit 3 - Robust Programs', chapters: ['Exception handling', 'Custom exceptions', 'SOLID principles'] },
    ],
  },
  {
    id: 'dsa',
    name: 'Data Structures and Algorithms',
    shortName: 'DSA',
    semester: 2,
    icon: 'network',
    accent: 'indigo',
    description:
      'The foundation of efficient programming: complexity analysis, linear and non-linear structures, sorting, searching and graph algorithms.',
    units: [
      { title: 'Unit 1 - Linear Structures', chapters: ['Complexity analysis', 'Arrays', 'Linked lists', 'Stacks and queues'] },
      { title: 'Unit 2 - Trees and Heaps', chapters: ['Binary search trees', 'Traversals', 'Heaps and priority queues'] },
      { title: 'Unit 3 - Graphs and Sorting', chapters: ['BFS and DFS', 'Shortest paths', 'Sorting algorithms'] },
    ],
  },
  {
    id: 'dbms',
    name: 'Database Management Systems',
    shortName: 'DBMS',
    semester: 3,
    icon: 'database',
    accent: 'sky',
    description:
      'Design and query reliable databases. Learn ER modelling, the relational model, SQL, normalization and transaction management.',
    units: [
      { title: 'Unit 1 - Data Modelling', chapters: ['Database concepts', 'ER model', 'Relational model', 'Keys'] },
      { title: 'Unit 2 - SQL', chapters: ['DDL and DML', 'Joins', 'Aggregation and grouping'] },
      { title: 'Unit 3 - Design and Transactions', chapters: ['Functional dependencies', 'Normal forms', 'ACID and isolation levels'] },
    ],
  },
  {
    id: 'web',
    name: 'Web Development',
    shortName: 'WEB',
    semester: 3,
    icon: 'layout',
    accent: 'emerald',
    description:
      'Build accessible, responsive websites with semantic HTML, modern CSS and JavaScript, including the DOM, async code and browser storage.',
    units: [
      { title: 'Unit 1 - Structure and Style', chapters: ['Semantic HTML', 'Box model', 'Flexbox and Grid', 'Responsive design'] },
      { title: 'Unit 2 - JavaScript', chapters: ['Language essentials', 'DOM and events', 'Promises and async/await', 'Browser storage'] },
    ],
  },
  {
    id: 'os',
    name: 'Operating Systems',
    shortName: 'OS',
    semester: 4,
    icon: 'cpu',
    accent: 'amber',
    description:
      'Understand what happens beneath your programs: processes, threads, scheduling, synchronization, memory management and deadlocks.',
    units: [
      { title: 'Unit 1 - Processes and Threads', chapters: ['Process states and PCB', 'Threads', 'System calls'] },
      { title: 'Unit 2 - Scheduling and Synchronization', chapters: ['CPU scheduling', 'Critical sections', 'Semaphores and monitors'] },
      { title: 'Unit 3 - Memory and Deadlocks', chapters: ['Paging', 'Virtual memory', 'Page replacement', 'Deadlock handling'] },
    ],
  },
  {
    id: 'cn',
    name: 'Computer Networks',
    shortName: 'CN',
    semester: 5,
    icon: 'network',
    accent: 'teal',
    description:
      'How data moves across the Internet: layered models, addressing and subnetting, routing, TCP and UDP, and core application protocols.',
    units: [
      { title: 'Unit 1 - Models and Data Link', chapters: ['OSI and TCP/IP', 'Framing and error detection', 'Switching'] },
      { title: 'Unit 2 - Network Layer', chapters: ['IPv4 and subnetting', 'NAT', 'Routing algorithms'] },
      { title: 'Unit 3 - Transport and Application', chapters: ['TCP and UDP', 'Congestion control', 'DNS, HTTP and SMTP'] },
    ],
  },
  {
    id: 'se',
    name: 'Software Engineering',
    shortName: 'SE',
    semester: 5,
    icon: 'clipboard',
    accent: 'rose',
    description:
      'Plan, design, test and maintain software professionally: process models, requirements, UML, testing strategies and quality practices.',
    units: [
      { title: 'Unit 1 - Process Models', chapters: ['SDLC', 'Waterfall and Spiral', 'Agile and Scrum'] },
      { title: 'Unit 2 - Requirements and Design', chapters: ['Requirement engineering', 'UML diagrams', 'Cohesion and coupling'] },
      { title: 'Unit 3 - Testing and Maintenance', chapters: ['Testing levels', 'Black-box and white-box', 'Cyclomatic complexity', 'Maintenance'] },
    ],
  },
  {
    id: 'ai',
    name: 'Artificial Intelligence',
    shortName: 'AI',
    semester: 6,
    icon: 'brain',
    accent: 'fuchsia',
    description:
      'An introduction to intelligent agents, search and heuristics, knowledge representation and the fundamentals of machine learning.',
    units: [
      { title: 'Unit 1 - Agents and Search', chapters: ['Intelligent agents', 'Uninformed search', 'A* and heuristics', 'Minimax'] },
      { title: 'Unit 2 - Knowledge and Learning', chapters: ['Logic', 'Supervised learning', 'Overfitting', 'Evaluation metrics'] },
    ],
  },
]

export const SEMESTERS = [1, 2, 3, 4, 5, 6] as const

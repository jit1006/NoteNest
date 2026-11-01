"""Demo content: DBMS, DSA, Operating Systems, Computer Networks (ASCII only)."""

DOCS = []

# ---------------------------------------------------------------- DBMS
DOCS.append({
    "file": "dbms-er-model-relational", "kind": "notes",
    "subject": "Database Management Systems",
    "title": "ER Model and Relational Model",
    "subtitle": "Unit 1 - Data modelling fundamentals",
    "blocks": [
        ("h", "Why databases?"),
        ("p", "A database management system (DBMS) stores shared data in a structured way and gives applications safe, concurrent access to it. Compared with plain files, a DBMS reduces redundancy, enforces integrity rules, supports transactions and separates how data is stored from how it is used (data independence)."),
        ("h", "Entity-Relationship (ER) model"),
        ("p", "The ER model describes a system as entities, attributes and relationships before any tables are designed."),
        ("b", [
            "Entity: a distinguishable thing, e.g. Student, Course. A weak entity cannot be identified without its owner entity.",
            "Attribute: a property of an entity. Types: simple, composite (Name = First + Last), multivalued (Phone), derived (Age from DateOfBirth).",
            "Relationship: an association between entities, e.g. Student ENROLLS_IN Course.",
            "Cardinality: 1:1, 1:N, M:N. Participation: total (every instance must take part) or partial.",
        ]),
        ("note", "Worked example: a Student may enrol in many Courses and a Course has many Students, so ENROLLS_IN is M:N. It becomes its own table holding both keys."),
        ("h", "Mapping ER to relational tables"),
        ("b", [
            "Each strong entity becomes a table; the key attribute becomes the primary key.",
            "A 1:N relationship adds the key of the '1' side as a foreign key on the 'N' side.",
            "An M:N relationship becomes a new table whose primary key combines both foreign keys.",
            "A multivalued attribute becomes a separate table referencing the entity.",
        ]),
        ("h", "Keys"),
        ("b", [
            "Super key: any set of attributes that uniquely identifies a row.",
            "Candidate key: a minimal super key. Primary key: the candidate key chosen as the main identifier.",
            "Foreign key: attribute(s) referencing a primary key in another table - this enforces referential integrity.",
        ]),
        ("code", [
            "CREATE TABLE Student (",
            "  roll_no   INT PRIMARY KEY,",
            "  name      VARCHAR(60) NOT NULL,",
            "  email     VARCHAR(80) UNIQUE",
            ");",
            "CREATE TABLE Enrollment (",
            "  roll_no   INT REFERENCES Student(roll_no),",
            "  course_id INT REFERENCES Course(course_id),",
            "  PRIMARY KEY (roll_no, course_id)",
            ");",
        ]),
        ("h", "Relational algebra in one minute"),
        ("b", [
            "Selection (sigma) picks rows that satisfy a condition.",
            "Projection (pi) picks columns and removes duplicates.",
            "Union, intersection and difference need union-compatible relations.",
            "Join combines related rows; natural join matches on equal common attributes.",
        ]),
    ],
})

DOCS.append({
    "file": "dbms-sql-normalization", "kind": "notes",
    "subject": "Database Management Systems",
    "title": "SQL Essentials and Normalization",
    "subtitle": "Units 2-3 - Querying and schema design",
    "blocks": [
        ("h", "Core SQL statements"),
        ("code", [
            "SELECT dept, COUNT(*) AS staff, AVG(salary) AS avg_pay",
            "FROM   Employee",
            "WHERE  active = 1",
            "GROUP  BY dept",
            "HAVING COUNT(*) >= 3",
            "ORDER  BY avg_pay DESC;",
        ]),
        ("p", "WHERE filters rows before grouping; HAVING filters groups after aggregation. The logical order of evaluation is FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY."),
        ("h", "Joins"),
        ("b", [
            "INNER JOIN returns only matching rows from both tables.",
            "LEFT JOIN keeps every row from the left table and fills missing right-side columns with NULL.",
            "FULL OUTER JOIN keeps unmatched rows from both sides.",
            "A subquery can replace many joins, but a join is often easier for the optimizer.",
        ]),
        ("h", "Functional dependencies"),
        ("p", "A functional dependency X -> Y means that whenever two rows agree on X they must agree on Y. For example roll_no -> name. Normalization uses dependencies to remove update, insert and delete anomalies."),
        ("h", "Normal forms"),
        ("b", [
            "1NF: every attribute is atomic - no repeating groups or lists in a cell.",
            "2NF: 1NF plus no partial dependency (a non-key attribute depending on only part of a composite key).",
            "3NF: 2NF plus no transitive dependency (non-key -> non-key).",
            "BCNF: for every non-trivial dependency X -> Y, X must be a super key.",
        ]),
        ("note", "Example: Order(order_id, product_id, product_name, qty) with product_id -> product_name violates 2NF. Split into Order(order_id, product_id, qty) and Product(product_id, product_name)."),
        ("h", "Transactions and ACID"),
        ("b", [
            "Atomicity: all operations of a transaction happen or none do.",
            "Consistency: a transaction moves the database from one valid state to another.",
            "Isolation: concurrent transactions do not see each other's partial work.",
            "Durability: committed changes survive crashes.",
        ]),
        ("p", "Isolation levels (read uncommitted, read committed, repeatable read, serializable) trade correctness against concurrency by allowing or preventing dirty reads, non-repeatable reads and phantom rows."),
    ],
})

DOCS.append({
    "file": "dbms-practice-paper", "kind": "pyq",
    "subject": "Database Management Systems",
    "title": "DBMS Model Practice Paper",
    "subtitle": "Demo paper - 2025 edition - 50 marks",
    "blocks": [
        ("note", "This is a self-created practice paper written for NoteNest. It is NOT an official university question paper. Use it to rehearse the style of exam questions."),
        ("h", "Section A - Short answers (2 x 5 marks)"),
        ("q", "Differentiate between a primary key, a candidate key and a super key with examples.", 5),
        ("q", "List the four ACID properties and explain Atomicity with a bank-transfer example.", 5),
        ("h", "Section B - Medium answers (3 x 8 marks)"),
        ("q", "Draw an ER diagram for a library (Member, Book, Loan) and map it to relational tables.", 8),
        ("q", "Write SQL to list departments whose average salary exceeds 50000, ordered by average salary descending. Explain why HAVING is needed.", 8),
        ("q", "Explain 2NF and 3NF. Normalize Order(order_id, product_id, product_name, qty) step by step.", 8),
        ("h", "Section C - Long answer (1 x 11 marks)"),
        ("q", "Explain the four isolation levels and the anomalies each one prevents. Give an example of a phantom read.", 11),
        ("h", "Answer hints"),
        ("b", [
            "Q1: primary key is the chosen candidate key; every candidate key is a minimal super key.",
            "Q4: use GROUP BY dept with HAVING AVG(salary) > 50000 because WHERE cannot filter aggregates.",
            "Q5: product_name depends only on product_id, a partial dependency, so split the table.",
        ]),
    ],
})

DOCS.append({
    "file": "dbms-sql-cheatsheet", "kind": "reference",
    "subject": "Database Management Systems",
    "title": "SQL Quick Reference",
    "subtitle": "One-page cheat sheet",
    "blocks": [
        ("h", "Query skeleton"),
        ("code", [
            "SELECT [DISTINCT] columns | aggregates",
            "FROM table [JOIN other ON condition]",
            "[WHERE row_condition]",
            "[GROUP BY columns [HAVING group_condition]]",
            "[ORDER BY column [ASC|DESC]] [LIMIT n];",
        ]),
        ("h", "Aggregates"),
        ("b", ["COUNT(*), COUNT(col) ignores NULL, SUM, AVG, MIN, MAX.", "Use COUNT(DISTINCT col) to count unique values."]),
        ("h", "Data definition and manipulation"),
        ("code", [
            "CREATE TABLE t (id INT PRIMARY KEY, name TEXT NOT NULL);",
            "ALTER TABLE t ADD COLUMN age INT;",
            "INSERT INTO t (id, name) VALUES (1, 'Asha');",
            "UPDATE t SET age = 21 WHERE id = 1;",
            "DELETE FROM t WHERE id = 1;",
            "DROP TABLE t;",
        ]),
        ("h", "Constraints"),
        ("b", ["PRIMARY KEY, UNIQUE, NOT NULL, CHECK (age >= 0), FOREIGN KEY ... REFERENCES.", "ON DELETE CASCADE removes child rows automatically."]),
        ("h", "NULL handling"),
        ("b", ["Use IS NULL / IS NOT NULL - never = NULL.", "COALESCE(a, b) returns the first non-NULL value."]),
    ],
})

# ---------------------------------------------------------------- DSA
DOCS.append({
    "file": "dsa-arrays-linked-lists", "kind": "notes",
    "subject": "Data Structures and Algorithms",
    "title": "Complexity, Arrays, Stacks and Linked Lists",
    "subtitle": "Unit 1 - Linear data structures",
    "blocks": [
        ("h", "Measuring efficiency"),
        ("p", "Big-O notation describes how running time or memory grows with input size n, ignoring constants. Common classes from fastest to slowest: O(1), O(log n), O(n), O(n log n), O(n^2), O(2^n)."),
        ("code", [
            "def linear_search(a, x):        # O(n)",
            "    for i, v in enumerate(a):",
            "        if v == x:",
            "            return i",
            "    return -1",
        ]),
        ("h", "Arrays"),
        ("b", [
            "Contiguous memory; access by index is O(1).",
            "Insert or delete in the middle is O(n) because elements shift.",
            "Binary search needs a sorted array and runs in O(log n).",
        ]),
        ("h", "Linked lists"),
        ("p", "A singly linked list stores nodes with a value and a next pointer. Insertion at the head is O(1); searching is O(n). A doubly linked list adds a prev pointer, making deletion of a known node O(1)."),
        ("code", [
            "class Node:",
            "    def __init__(self, val, nxt=None):",
            "        self.val, self.next = val, nxt",
            "",
            "def reverse(head):",
            "    prev = None",
            "    while head:",
            "        head.next, prev, head = prev, head, head.next",
            "    return prev",
        ]),
        ("h", "Stack and queue"),
        ("b", [
            "Stack - LIFO. push, pop, peek in O(1). Used for function calls, undo, bracket matching, expression evaluation.",
            "Queue - FIFO. enqueue, dequeue in O(1) with a linked list or circular buffer. Used in scheduling and BFS.",
        ]),
        ("note", "Exam tip: when asked to evaluate a postfix expression, push operands and, on each operator, pop two values (right operand first), apply the operator and push the result."),
    ],
})

DOCS.append({
    "file": "dsa-trees-graphs", "kind": "notes",
    "subject": "Data Structures and Algorithms",
    "title": "Trees, Graphs, Sorting and Searching",
    "subtitle": "Units 2-3 - Non-linear structures and algorithms",
    "blocks": [
        ("h", "Binary trees and BSTs"),
        ("p", "A binary tree node has at most two children. In a binary search tree (BST) every key in the left subtree is smaller and every key in the right subtree is larger, so search, insert and delete take O(h) where h is the height - O(log n) when balanced, O(n) when skewed."),
        ("b", [
            "Inorder (L, root, R) of a BST visits keys in sorted order.",
            "Preorder (root, L, R) is used to copy a tree; postorder (L, R, root) to delete one.",
            "Level order uses a queue.",
            "AVL and red-black trees rotate to stay balanced.",
        ]),
        ("h", "Heaps"),
        ("p", "A binary heap is a complete binary tree stored in an array where each parent is <= its children (min-heap). Insert and extract-min cost O(log n); building a heap from n items costs O(n). Heaps power priority queues and heap sort."),
        ("h", "Graphs"),
        ("p", "A graph G = (V, E) can be stored as an adjacency matrix (O(V^2) space, O(1) edge check) or adjacency lists (O(V+E) space)."),
        ("code", [
            "from collections import deque",
            "def bfs(g, s):",
            "    seen, q = {s}, deque([s])",
            "    while q:",
            "        u = q.popleft()",
            "        for v in g[u]:",
            "            if v not in seen:",
            "                seen.add(v); q.append(v)",
            "    return seen",
        ]),
        ("b", [
            "BFS finds shortest paths in unweighted graphs; DFS is used for cycle detection and topological sort.",
            "Dijkstra finds shortest paths with non-negative weights in O((V+E) log V) using a heap.",
            "Kruskal and Prim build minimum spanning trees.",
        ]),
        ("h", "Sorting"),
        ("b", [
            "Bubble, selection, insertion: O(n^2). Insertion sort is fast on nearly sorted data.",
            "Merge sort: O(n log n) always, stable, needs O(n) extra space.",
            "Quick sort: O(n log n) average, O(n^2) worst case, in-place.",
            "Heap sort: O(n log n), in-place, not stable.",
        ]),
    ],
})

DOCS.append({
    "file": "dsa-practice-paper", "kind": "pyq",
    "subject": "Data Structures and Algorithms",
    "title": "DSA Model Practice Paper",
    "subtitle": "Demo paper - 2024 edition - 50 marks",
    "blocks": [
        ("note", "Self-created practice paper for NoteNest. It is not an official university paper and is not taken from any real examination."),
        ("h", "Section A - Short answers (4 x 4 marks)"),
        ("q", "Define Big-O notation and state the complexity of binary search and of insertion at the head of a linked list.", 4),
        ("q", "Convert the infix expression (A + B) * C - D to postfix and evaluate it for A=2, B=3, C=4, D=5.", 4),
        ("q", "Differentiate between BFS and DFS with one application of each.", 4),
        ("q", "Why is the worst case of quick sort O(n^2)? Name one way to avoid it.", 4),
        ("h", "Section B - Long answers (2 x 17 marks)"),
        ("q", "Insert 50, 30, 70, 20, 40, 60, 80 into an empty BST. Draw the tree, give all three depth-first traversals and show how to delete 30.", 17),
        ("q", "Explain Dijkstra's algorithm. Apply it to a 5-node weighted graph of your choice and list the shortest distance to each node. State its time complexity with a binary heap.", 17),
        ("h", "Answer hints"),
        ("b", [
            "Q2: postfix is A B + C * D - ; the value is (2+3)*4-5 = 15.",
            "Q4: a bad pivot (smallest or largest element every time) gives unbalanced partitions; use a random or median-of-three pivot.",
            "Q5: inorder of the BST is 20 30 40 50 60 70 80.",
        ]),
    ],
})

DOCS.append({
    "file": "dsa-complexity-cheatsheet", "kind": "reference",
    "subject": "Data Structures and Algorithms",
    "title": "Complexity Cheat Sheet",
    "subtitle": "Time and space at a glance",
    "blocks": [
        ("h", "Data structure operations (average case)"),
        ("code", [
            "Structure        Access    Search    Insert    Delete",
            "Array            O(1)      O(n)      O(n)      O(n)",
            "Linked list      O(n)      O(n)      O(1)*     O(1)*",
            "Stack / Queue    -         O(n)      O(1)      O(1)",
            "Hash table       -         O(1)      O(1)      O(1)",
            "BST (balanced)   -         O(log n)  O(log n)  O(log n)",
            "Binary heap      -         O(n)      O(log n)  O(log n)",
        ]),
        ("note", "* Insert/delete at a known position (head, or given node in a doubly linked list)."),
        ("h", "Sorting algorithms"),
        ("code", [
            "Algorithm   Best        Average     Worst       Stable",
            "Bubble      O(n)        O(n^2)      O(n^2)      yes",
            "Insertion   O(n)        O(n^2)      O(n^2)      yes",
            "Selection   O(n^2)      O(n^2)      O(n^2)      no",
            "Merge       O(n log n)  O(n log n)  O(n log n)  yes",
            "Quick       O(n log n)  O(n log n)  O(n^2)      no",
            "Heap        O(n log n)  O(n log n)  O(n log n)  no",
        ]),
        ("h", "Graph algorithms"),
        ("b", [
            "BFS / DFS: O(V + E).",
            "Dijkstra (binary heap): O((V + E) log V).",
            "Bellman-Ford: O(V * E), handles negative edges.",
            "Kruskal: O(E log E). Prim (heap): O(E log V).",
        ]),
    ],
})

# ---------------------------------------------------------------- OS
DOCS.append({
    "file": "os-processes-scheduling", "kind": "notes",
    "subject": "Operating Systems",
    "title": "Processes, Threads and CPU Scheduling",
    "subtitle": "Units 1-2 - Process management",
    "blocks": [
        ("h", "What does an operating system do?"),
        ("p", "An operating system manages hardware resources (CPU, memory, storage, devices), provides abstractions such as processes and files, and offers a safe interface to programs through system calls."),
        ("h", "Processes"),
        ("p", "A process is a program in execution with its own address space, registers and open files. The OS tracks each process in a Process Control Block (PCB)."),
        ("b", [
            "States: new, ready, running, waiting (blocked), terminated.",
            "A context switch saves the state of the running process and loads another - it is pure overhead.",
            "fork() creates a child process; exec() replaces its program image; wait() lets the parent collect the exit status.",
        ]),
        ("h", "Threads"),
        ("p", "Threads are lightweight units of execution inside a process. They share code, heap and files but have separate stacks and registers, so creation and switching are cheaper than for processes - but shared data needs synchronization."),
        ("h", "CPU scheduling criteria"),
        ("b", [
            "CPU utilization and throughput - maximize.",
            "Turnaround time = completion - arrival. Waiting time = turnaround - burst. Response time = first run - arrival.",
        ]),
        ("h", "Scheduling algorithms"),
        ("b", [
            "FCFS: simple, non-preemptive, suffers from the convoy effect.",
            "SJF / SRTF: minimum average waiting time but needs burst estimates and can starve long jobs.",
            "Round Robin: each process gets a time quantum; good response time; too small a quantum causes overhead.",
            "Priority: highest priority first; use aging to prevent starvation.",
        ]),
        ("note", "Worked example (FCFS): P1 burst 5, P2 burst 3, P3 burst 8, all arriving at 0. Waiting times are 0, 5 and 8, so the average waiting time is 13/3 = 4.33."),
        ("h", "Synchronization"),
        ("p", "A race condition occurs when the result depends on thread timing. A critical section must offer mutual exclusion, progress and bounded waiting. Tools: mutex locks, semaphores (wait/signal) and monitors. Classic problems: producer-consumer, readers-writers, dining philosophers."),
    ],
})

DOCS.append({
    "file": "os-memory-deadlocks", "kind": "notes",
    "subject": "Operating Systems",
    "title": "Memory Management, Virtual Memory and Deadlocks",
    "subtitle": "Units 3-4 - Memory and resources",
    "blocks": [
        ("h", "Paging"),
        ("p", "Paging splits logical memory into fixed-size pages and physical memory into frames of the same size. A page table maps page numbers to frame numbers, which removes external fragmentation (internal fragmentation can remain in the last page)."),
        ("code", [
            "logical address = (page number p, offset d)",
            "physical address = frame(p) * page_size + d",
            "page size 4 KB -> offset uses 12 bits",
        ]),
        ("p", "A Translation Lookaside Buffer (TLB) caches recent translations. Effective access time = hit ratio * (TLB + memory) + miss ratio * (TLB + 2 * memory)."),
        ("h", "Virtual memory and page replacement"),
        ("p", "Demand paging loads a page only when it is referenced. A page fault occurs when the page is not in memory and must be fetched from disk."),
        ("b", [
            "FIFO: evict the oldest page; may show Belady's anomaly.",
            "Optimal: evict the page not needed for the longest time (theoretical benchmark).",
            "LRU: evict the least recently used page; a good practical approximation of optimal.",
            "Thrashing: the system spends more time paging than executing; reduce multiprogramming or use the working-set model.",
        ]),
        ("h", "Deadlocks"),
        ("p", "A deadlock is a set of processes each waiting for a resource held by another. It needs all four Coffman conditions simultaneously:"),
        ("b", [
            "Mutual exclusion - a resource is held by one process at a time.",
            "Hold and wait - a process holds resources while waiting for more.",
            "No preemption - resources cannot be forcibly taken.",
            "Circular wait - a cycle of processes each waiting for the next.",
        ]),
        ("h", "Handling deadlocks"),
        ("b", [
            "Prevention: break at least one Coffman condition, e.g. order resources to avoid circular wait.",
            "Avoidance: Banker's algorithm grants a request only if the system stays in a safe state.",
            "Detection and recovery: build a wait-for graph, then terminate or roll back processes.",
        ]),
        ("note", "Safe state means there is some order in which every process can finish using the currently available resources plus those released by earlier processes."),
    ],
})

DOCS.append({
    "file": "os-practice-paper", "kind": "pyq",
    "subject": "Operating Systems",
    "title": "Operating Systems Model Practice Paper",
    "subtitle": "Demo paper - 2025 edition - 50 marks",
    "blocks": [
        ("note", "Self-created practice paper for NoteNest. It does not reproduce any official university question paper."),
        ("h", "Section A - Short answers (5 x 4 marks)"),
        ("q", "Distinguish between a process and a thread.", 4),
        ("q", "What information is stored in a Process Control Block?", 4),
        ("q", "Define turnaround time, waiting time and response time.", 4),
        ("q", "What is a page fault? Describe the steps the OS takes to handle one.", 4),
        ("q", "State the four necessary conditions for deadlock.", 4),
        ("h", "Section B - Long answers (2 x 15 marks)"),
        ("q", "Processes P1(arrival 0, burst 6), P2(1, 4), P3(2, 2) are scheduled with Round Robin, quantum 2. Draw the Gantt chart and compute the average waiting and turnaround times.", 15),
        ("q", "For the reference string 7 0 1 2 0 3 0 4 2 3 with 3 frames, count the page faults under FIFO and LRU. Which performs better here and why?", 15),
        ("h", "Answer hints"),
        ("b", [
            "Q3: turnaround = completion - arrival; waiting = turnaround - burst; response = first CPU time - arrival.",
            "Q7: FIFO gives 9 faults on this string; LRU gives 8 - verify by drawing the frame table.",
        ]),
    ],
})

# ---------------------------------------------------------------- CN
DOCS.append({
    "file": "cn-layered-models", "kind": "notes",
    "subject": "Computer Networks",
    "title": "Network Models, Data Link and IP Addressing",
    "subtitle": "Units 1-2 - Foundations",
    "blocks": [
        ("h", "Why layers?"),
        ("p", "Layering splits the complex job of communication into smaller services. Each layer talks to the layer above and below through interfaces and to its peer on the other host through a protocol."),
        ("h", "OSI vs TCP/IP"),
        ("code", [
            "OSI layer        TCP/IP layer    Examples",
            "7 Application    Application     HTTP, DNS, SMTP",
            "6 Presentation   Application     TLS, encoding",
            "5 Session        Application     sessions",
            "4 Transport      Transport       TCP, UDP",
            "3 Network        Internet        IP, ICMP",
            "2 Data link      Link            Ethernet, Wi-Fi",
            "1 Physical       Link            cables, radio",
        ]),
        ("h", "Data link layer"),
        ("b", [
            "Framing, MAC addressing (48-bit), error detection with CRC.",
            "Flow control: stop-and-wait, sliding window (Go-Back-N, Selective Repeat).",
            "Switches forward frames using a MAC address table learned from source addresses.",
        ]),
        ("h", "IPv4 addressing and subnetting"),
        ("p", "An IPv4 address has 32 bits written as four decimal octets. CIDR notation a.b.c.d/n means the first n bits identify the network."),
        ("note", "Example: 192.168.10.0/26 -> 6 host bits, 2^6 = 64 addresses, 62 usable hosts (minus network and broadcast). Subnet mask 255.255.255.192; the next subnet starts at 192.168.10.64."),
        ("b", [
            "Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.",
            "NAT lets many private hosts share one public address.",
            "IPv6 uses 128-bit addresses to solve address exhaustion.",
        ]),
    ],
})

DOCS.append({
    "file": "cn-transport-routing", "kind": "notes",
    "subject": "Computer Networks",
    "title": "Routing, TCP/UDP and Application Protocols",
    "subtitle": "Units 3-4 - Network, transport and application layers",
    "blocks": [
        ("h", "Routing"),
        ("b", [
            "A router forwards packets by longest-prefix match in its forwarding table.",
            "Distance-vector (RIP) shares distance tables with neighbours using Bellman-Ford; it can suffer count-to-infinity.",
            "Link-state (OSPF) floods link information so each router runs Dijkstra on the full topology.",
            "BGP exchanges routes between autonomous systems on the Internet.",
        ]),
        ("h", "UDP vs TCP"),
        ("code", [
            "Feature        UDP               TCP",
            "Connection     none              3-way handshake",
            "Reliability    none              ACKs, retransmission",
            "Ordering       none              sequence numbers",
            "Overhead      8-byte header     20+ byte header",
            "Use            DNS, streaming    web, email, file transfer",
        ]),
        ("h", "TCP connection and control"),
        ("b", [
            "Establish: SYN, SYN-ACK, ACK. Close: FIN/ACK exchange in each direction.",
            "Flow control uses the receiver window so a fast sender cannot overwhelm a slow receiver.",
            "Congestion control: slow start grows the window exponentially until a threshold, then congestion avoidance grows it linearly; on loss the window shrinks.",
        ]),
        ("h", "Application layer"),
        ("b", [
            "DNS translates names to IP addresses using a hierarchy of resolvers and name servers.",
            "HTTP is a request-response protocol; HTTPS is HTTP over TLS.",
            "SMTP sends mail; IMAP and POP3 retrieve it.",
        ]),
        ("note", "What happens when you type a URL? DNS lookup, TCP handshake, TLS handshake, HTTP request, server response, browser renders the page."),
    ],
})

DOCS.append({
    "file": "cn-practice-paper", "kind": "pyq",
    "subject": "Computer Networks",
    "title": "Computer Networks Model Practice Paper",
    "subtitle": "Demo paper - 2023 edition - 50 marks",
    "blocks": [
        ("note", "Self-created practice paper for NoteNest. Not an official university paper."),
        ("h", "Section A - Short answers (4 x 5 marks)"),
        ("q", "Compare the OSI and TCP/IP reference models.", 5),
        ("q", "How many usable hosts does a /27 network provide? Write its subnet mask.", 5),
        ("q", "Differentiate between TCP and UDP and give one application of each.", 5),
        ("q", "Explain the role of DNS.", 5),
        ("h", "Section B - Long answers (2 x 15 marks)"),
        ("q", "Explain the TCP three-way handshake and the slow-start / congestion-avoidance phases of TCP congestion control with a diagram.", 15),
        ("q", "Compare distance-vector and link-state routing. Describe the count-to-infinity problem and one remedy.", 15),
        ("h", "Answer hints"),
        ("b", [
            "Q2: a /27 leaves 5 host bits, so 2^5 - 2 = 30 usable hosts; mask 255.255.255.224.",
            "Q6: remedies include split horizon and route poisoning.",
        ]),
    ],
})

DOCS.append({
    "file": "cn-ports-protocols-reference", "kind": "reference",
    "subject": "Computer Networks",
    "title": "Common Ports and Protocols",
    "subtitle": "Quick reference",
    "blocks": [
        ("h", "Well-known ports"),
        ("code", [
            "Port   Protocol  Purpose",
            "20/21  FTP       File transfer (data / control)",
            "22     SSH       Secure remote login",
            "25     SMTP      Send email",
            "53     DNS       Name resolution (UDP and TCP)",
            "80     HTTP      Web",
            "110    POP3      Retrieve email",
            "143    IMAP      Retrieve email",
            "443    HTTPS     Web over TLS",
        ]),
        ("h", "Subnet cheat table"),
        ("code", [
            "CIDR  Mask             Usable hosts",
            "/24   255.255.255.0    254",
            "/25   255.255.255.128  126",
            "/26   255.255.255.192  62",
            "/27   255.255.255.224  30",
            "/28   255.255.255.240  14",
            "/30   255.255.255.252  2",
        ]),
        ("note", "Usable hosts = 2^(32 - prefix) - 2."),
    ],
})

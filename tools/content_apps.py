"""Demo content: OOP, Software Engineering, Web Development, AI (ASCII only)."""

DOCS = []

# ---------------------------------------------------------------- OOP
DOCS.append({
    "file": "oop-core-principles", "kind": "notes",
    "subject": "Object-Oriented Programming",
    "title": "Classes, Objects and the Four Pillars",
    "subtitle": "Unit 1 - Core OOP concepts",
    "blocks": [
        ("h", "Procedural vs object-oriented"),
        ("p", "Procedural code organizes a program around functions that act on shared data. Object-oriented programming (OOP) bundles data and the operations on it into objects, which makes large programs easier to reason about, reuse and test."),
        ("h", "Classes and objects"),
        ("p", "A class is a blueprint that defines fields (state) and methods (behaviour). An object is an instance of a class with its own state. Constructors initialize new objects."),
        ("code", [
            "class Account {",
            "    private double balance;           // encapsulated state",
            "    public Account(double opening) { balance = opening; }",
            "    public void deposit(double amt) {",
            "        if (amt <= 0) throw new IllegalArgumentException();",
            "        balance += amt;",
            "    }",
            "    public double getBalance() { return balance; }",
            "}",
        ]),
        ("h", "The four pillars"),
        ("b", [
            "Encapsulation: hide internal state behind a public interface (private fields + methods) so invariants cannot be broken from outside.",
            "Abstraction: expose what an object does, not how - via abstract classes and interfaces.",
            "Inheritance: a subclass reuses and extends a superclass (an is-a relationship).",
            "Polymorphism: one interface, many behaviours - the method that runs depends on the actual object type.",
        ]),
        ("h", "Static vs instance members"),
        ("p", "A static member belongs to the class itself and is shared by all objects; an instance member belongs to a single object. Static methods cannot use this."),
        ("note", "Exam tip: constructor overloading is compile-time polymorphism; constructors are never inherited, but a subclass constructor calls super(...) first."),
    ],
})

DOCS.append({
    "file": "oop-inheritance-polymorphism", "kind": "notes",
    "subject": "Object-Oriented Programming",
    "title": "Inheritance, Polymorphism, Interfaces and Exceptions",
    "subtitle": "Units 2-3 - Reuse and robustness",
    "blocks": [
        ("h", "Inheritance in practice"),
        ("code", [
            "abstract class Shape {",
            "    abstract double area();",
            "    public String toString() { return getClass().getSimpleName()",
            "        + \" area=\" + area(); }",
            "}",
            "class Circle extends Shape {",
            "    double r; Circle(double r) { this.r = r; }",
            "    double area() { return Math.PI * r * r; }",
            "}",
        ]),
        ("b", [
            "Single, multilevel and hierarchical inheritance are supported by most languages; Java avoids multiple class inheritance but allows multiple interfaces.",
            "super refers to the parent class; use it to call a parent constructor or overridden method.",
        ]),
        ("h", "Overloading vs overriding"),
        ("code", [
            "Overloading                    Overriding",
            "Same class, same name          Subclass redefines parent method",
            "Different parameter lists      Same signature and return type",
            "Resolved at compile time       Resolved at run time (dynamic dispatch)",
        ]),
        ("h", "Interfaces vs abstract classes"),
        ("b", [
            "An interface declares a contract; a class may implement many interfaces.",
            "An abstract class can hold state and partial implementation but is single-inherited.",
            "Prefer composition over inheritance when the relationship is has-a rather than is-a.",
        ]),
        ("h", "Exception handling"),
        ("p", "Exceptions separate error handling from normal logic. Use try to guard risky code, catch to handle specific failures, finally for cleanup that must always run, and throw to signal an error. Checked exceptions must be declared or handled; unchecked ones (RuntimeException) indicate programming errors."),
        ("code", [
            "try (var in = new Scanner(new File(\"data.txt\"))) {",
            "    System.out.println(in.nextLine());",
            "} catch (FileNotFoundException e) {",
            "    System.err.println(\"Missing file: \" + e.getMessage());",
            "}",
        ]),
        ("h", "SOLID in one line each"),
        ("b", [
            "Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion.",
        ]),
    ],
})

DOCS.append({
    "file": "oop-practice-paper", "kind": "pyq",
    "subject": "Object-Oriented Programming",
    "title": "OOP Model Practice Paper",
    "subtitle": "Demo paper - 2024 edition - 50 marks",
    "blocks": [
        ("note", "Self-created practice paper for NoteNest, not an official university paper."),
        ("h", "Section A - Short answers (5 x 4 marks)"),
        ("q", "Define class and object with an example.", 4),
        ("q", "What is encapsulation? How does it protect an object's data?", 4),
        ("q", "Differentiate between method overloading and overriding.", 4),
        ("q", "What is the difference between an abstract class and an interface?", 4),
        ("q", "Explain the purpose of the finally block.", 4),
        ("h", "Section B - Long answers (2 x 15 marks)"),
        ("q", "Design classes Shape, Circle and Rectangle with an abstract area() method. Show how polymorphism lets you compute the total area of a list of shapes.", 15),
        ("q", "Explain checked and unchecked exceptions. Write a program that defines a custom InsufficientBalanceException and uses it in a withdraw() method.", 15),
        ("h", "Answer hints"),
        ("b", [
            "Q3: overloading is resolved at compile time within one class; overriding at run time across a hierarchy.",
            "Q6: store shapes in a List<Shape> and call area() on each - dynamic dispatch picks the right version.",
        ]),
    ],
})

# ---------------------------------------------------------------- SE
DOCS.append({
    "file": "se-sdlc-models", "kind": "notes",
    "subject": "Software Engineering",
    "title": "SDLC, Process Models and Requirements",
    "subtitle": "Units 1-2 - Building software systematically",
    "blocks": [
        ("h", "Software Development Life Cycle"),
        ("p", "The SDLC organizes work into phases: requirements, design, implementation, testing, deployment and maintenance. Process models arrange these phases differently."),
        ("h", "Process models"),
        ("b", [
            "Waterfall: sequential phases; simple and well documented but inflexible when requirements change.",
            "Incremental: deliver the product in working slices.",
            "Spiral: iterative with explicit risk analysis in each loop; suited to large, risky projects.",
            "Agile (Scrum, Kanban): short iterations, working software, continuous feedback, close customer collaboration.",
        ]),
        ("h", "Scrum at a glance"),
        ("b", [
            "Roles: Product Owner, Scrum Master, Development Team.",
            "Artifacts: product backlog, sprint backlog, increment.",
            "Events: sprint planning, daily stand-up, sprint review, retrospective.",
        ]),
        ("h", "Requirements engineering"),
        ("p", "Functional requirements say what the system does (a student can download a PDF). Non-functional requirements say how well it does it (pages load in under two seconds, works on phones). Good requirements are testable, unambiguous and traceable."),
        ("note", "User-story template: As a <role>, I want <goal> so that <benefit>. Add acceptance criteria that can be checked yes/no."),
        ("h", "UML diagrams you should know"),
        ("b", [
            "Use case diagram - actors and what they can do.",
            "Class diagram - classes, attributes, relationships.",
            "Sequence diagram - message order between objects over time.",
            "Activity and state diagrams - workflows and life cycles.",
        ]),
    ],
})

DOCS.append({
    "file": "se-testing-design", "kind": "notes",
    "subject": "Software Engineering",
    "title": "Design, Testing and Maintenance",
    "subtitle": "Units 3-4 - Quality assurance",
    "blocks": [
        ("h", "Good design"),
        ("b", [
            "High cohesion: a module does one well-defined job.",
            "Low coupling: modules depend on each other as little as possible.",
            "Modularity, information hiding and clear interfaces make change cheap.",
        ]),
        ("h", "Testing levels"),
        ("b", [
            "Unit testing - one function or class in isolation.",
            "Integration testing - modules working together.",
            "System testing - the whole product against requirements.",
            "Acceptance testing - the customer decides it is fit for use.",
        ]),
        ("h", "Black-box vs white-box"),
        ("p", "Black-box techniques ignore the code: equivalence partitioning and boundary value analysis. White-box techniques use the code structure: statement, branch and path coverage."),
        ("note", "Boundary value example: an age field accepts 18 to 60. Test 17, 18, 19, 59, 60 and 61."),
        ("h", "Cyclomatic complexity"),
        ("code", [
            "V(G) = E - N + 2P",
            "  E = edges, N = nodes, P = connected components",
            "Shortcut: V(G) = number of decision points + 1",
        ]),
        ("p", "V(G) gives the number of independent paths, and so the minimum number of test cases needed for full branch coverage."),
        ("h", "Maintenance and quality"),
        ("b", [
            "Types: corrective, adaptive, perfective, preventive.",
            "Version control (Git), code reviews and continuous integration keep quality high.",
            "Technical debt is the future cost of shortcuts taken now.",
        ]),
    ],
})

DOCS.append({
    "file": "se-practice-paper", "kind": "pyq",
    "subject": "Software Engineering",
    "title": "Software Engineering Model Practice Paper",
    "subtitle": "Demo paper - 2025 edition - 50 marks",
    "blocks": [
        ("note", "Self-created practice paper for NoteNest, not an official university paper."),
        ("h", "Section A - Short answers (5 x 4 marks)"),
        ("q", "List the phases of the SDLC.", 4),
        ("q", "Differentiate between functional and non-functional requirements with two examples each.", 4),
        ("q", "What is coupling? Why is low coupling desirable?", 4),
        ("q", "Differentiate between black-box and white-box testing.", 4),
        ("q", "Define technical debt.", 4),
        ("h", "Section B - Long answers (2 x 15 marks)"),
        ("q", "Compare Waterfall and Agile. Describe a project for which each is a better fit.", 15),
        ("q", "A function has 3 if statements and 1 while loop. Compute its cyclomatic complexity and propose test cases for boundary values of a field that accepts 1 to 100.", 15),
        ("h", "Answer hints"),
        ("b", [
            "Q7: decision points = 4, so V(G) = 4 + 1 = 5.",
            "Q7: boundary tests for 1..100 are 0, 1, 2, 99, 100, 101.",
        ]),
    ],
})

# ---------------------------------------------------------------- Web
DOCS.append({
    "file": "web-html-css-basics", "kind": "notes",
    "subject": "Web Development",
    "title": "HTML5, CSS Layout and Responsive Design",
    "subtitle": "Unit 1 - Structure and style",
    "blocks": [
        ("h", "Semantic HTML"),
        ("p", "Semantic elements describe meaning, which helps accessibility, SEO and maintainability. Prefer header, nav, main, section, article, aside and footer over generic div elements."),
        ("code", [
            "<main>",
            "  <article>",
            "    <h1>Normalization</h1>",
            "    <p>Remove redundancy using normal forms.</p>",
            "  </article>",
            "</main>",
        ]),
        ("h", "The CSS box model"),
        ("p", "Every element is a box: content, padding, border and margin. With box-sizing: border-box, the declared width includes padding and border, which makes layouts predictable."),
        ("h", "Flexbox and Grid"),
        ("b", [
            "Flexbox is one-dimensional - great for navbars, toolbars and aligning items in a row or column.",
            "Grid is two-dimensional - great for page layouts and card galleries.",
        ]),
        ("code", [
            ".cards {",
            "  display: grid;",
            "  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));",
            "  gap: 1rem;",
            "}",
        ]),
        ("h", "Responsive design"),
        ("b", [
            "Design mobile-first, then add breakpoints with min-width media queries.",
            "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.",
            "Use relative units (rem, %, fr) and fluid images (max-width: 100%).",
        ]),
        ("h", "Accessibility checklist"),
        ("b", [
            "Every image has meaningful alt text; every form field has a label.",
            "Keep text contrast at or above 4.5:1 and make focus states visible.",
            "Everything usable by mouse must be usable by keyboard.",
        ]),
    ],
})

DOCS.append({
    "file": "web-javascript-dom", "kind": "notes",
    "subject": "Web Development",
    "title": "JavaScript, the DOM and Asynchronous Code",
    "subtitle": "Units 2-3 - Interactivity",
    "blocks": [
        ("h", "Language essentials"),
        ("b", [
            "Use const by default and let when reassignment is needed; avoid var.",
            "Functions are first-class values; arrow functions keep the surrounding this.",
            "Array methods map, filter and reduce express data transformations clearly.",
            "Use === instead of == to avoid surprising type coercion.",
        ]),
        ("code", [
            "const notes = [{ t: 'ER model', sem: 4 }, { t: 'Sorting', sem: 3 }];",
            "const sem4 = notes.filter(n => n.sem === 4).map(n => n.t);",
            "console.log(sem4);   // ['ER model']",
        ]),
        ("h", "The DOM"),
        ("p", "The Document Object Model is a tree of nodes representing the page. JavaScript selects nodes, changes them and reacts to events."),
        ("code", [
            "const btn = document.querySelector('#save');",
            "btn.addEventListener('click', () => {",
            "  localStorage.setItem('saved', 'yes');",
            "  btn.textContent = 'Saved';",
            "});",
        ]),
        ("h", "Asynchronous JavaScript"),
        ("p", "JavaScript runs on one thread with an event loop. Slow work such as network requests returns a Promise. async/await makes promise code read top-to-bottom."),
        ("code", [
            "async function load() {",
            "  try {",
            "    const res = await fetch('/data.json');",
            "    if (!res.ok) throw new Error(res.status);",
            "    return await res.json();",
            "  } catch (err) { console.error(err); }",
            "}",
        ]),
        ("h", "Browser storage"),
        ("b", [
            "localStorage keeps strings for the same origin until cleared (about 5 MB).",
            "sessionStorage is cleared when the tab closes.",
            "Always JSON.parse inside try/catch because stored data can be corrupted.",
        ]),
    ],
})

DOCS.append({
    "file": "web-practice-paper", "kind": "pyq",
    "subject": "Web Development",
    "title": "Web Development Model Practice Paper",
    "subtitle": "Demo paper - 2026 edition - 50 marks",
    "blocks": [
        ("note", "Self-created practice paper for NoteNest, not an official university paper."),
        ("h", "Section A - Short answers (5 x 4 marks)"),
        ("q", "List four semantic HTML5 elements and what each is used for.", 4),
        ("q", "Explain the CSS box model.", 4),
        ("q", "When would you choose CSS Grid over Flexbox?", 4),
        ("q", "Differentiate between == and === in JavaScript with examples.", 4),
        ("q", "What is the difference between localStorage and sessionStorage?", 4),
        ("h", "Section B - Long answers (2 x 15 marks)"),
        ("q", "Create a responsive card layout using CSS Grid that shows one column on phones, two on tablets and four on desktops. Write the HTML and CSS.", 15),
        ("q", "Explain Promises and async/await. Write a function that fetches JSON, handles HTTP errors and displays the result in the DOM.", 15),
        ("h", "Answer hints"),
        ("b", [
            "Q6: use a mobile-first grid with media queries at 640px and 1024px.",
            "Q7: check response.ok before calling response.json() and wrap the call in try/catch.",
        ]),
    ],
})

DOCS.append({
    "file": "web-http-status-reference", "kind": "reference",
    "subject": "Web Development",
    "title": "HTTP Methods and Status Codes",
    "subtitle": "Quick reference",
    "blocks": [
        ("h", "Methods"),
        ("code", [
            "GET     read a resource (safe, idempotent)",
            "POST    create a resource or trigger processing",
            "PUT     replace a resource (idempotent)",
            "PATCH   partially update a resource",
            "DELETE  remove a resource (idempotent)",
        ]),
        ("h", "Status codes"),
        ("code", [
            "200 OK                    204 No Content",
            "301 Moved Permanently     304 Not Modified",
            "400 Bad Request           401 Unauthorized",
            "403 Forbidden             404 Not Found",
            "409 Conflict              429 Too Many Requests",
            "500 Internal Server Error 503 Service Unavailable",
        ]),
        ("note", "Remember the families: 1xx info, 2xx success, 3xx redirect, 4xx client error, 5xx server error."),
    ],
})

# ---------------------------------------------------------------- AI
DOCS.append({
    "file": "ai-search-agents", "kind": "notes",
    "subject": "Artificial Intelligence",
    "title": "Intelligent Agents and Search Strategies",
    "subtitle": "Unit 1-2 - Problem solving",
    "blocks": [
        ("h", "What is AI?"),
        ("p", "Artificial intelligence studies how to build systems that perceive their environment and take actions that maximize their chance of achieving goals. Typical areas include search, knowledge representation, machine learning, natural language processing and computer vision."),
        ("h", "Intelligent agents"),
        ("b", [
            "An agent maps percepts from sensors to actions on actuators.",
            "Types: simple reflex, model-based reflex, goal-based, utility-based and learning agents.",
            "Environments are described as observable or partial, deterministic or stochastic, static or dynamic, discrete or continuous.",
        ]),
        ("h", "State-space search"),
        ("p", "Problems are formulated with an initial state, actions, a transition model, a goal test and a path cost."),
        ("b", [
            "BFS: complete, optimal for equal step costs, O(b^d) memory.",
            "DFS: low memory O(bm) but not complete on infinite or cyclic spaces.",
            "Uniform-cost search: expands the cheapest path first; optimal.",
            "Iterative deepening: DFS memory with BFS completeness.",
        ]),
        ("h", "Informed search and A*"),
        ("p", "A heuristic h(n) estimates the cost from node n to the goal. A* expands the node with the lowest f(n) = g(n) + h(n). It is optimal when h is admissible, meaning it never overestimates the real cost."),
        ("note", "8-puzzle example: the number of misplaced tiles and the Manhattan distance are both admissible heuristics; Manhattan distance is more informed, so A* expands fewer nodes."),
        ("h", "Adversarial search"),
        ("p", "Minimax picks the move that maximizes the player's worst-case outcome in two-player games. Alpha-beta pruning skips branches that cannot influence the decision, giving the same result with far fewer evaluations."),
    ],
})

DOCS.append({
    "file": "ai-ml-basics", "kind": "notes",
    "subject": "Artificial Intelligence",
    "title": "Knowledge Representation and Machine Learning Basics",
    "subtitle": "Units 3-4 - Reasoning and learning",
    "blocks": [
        ("h", "Propositional and predicate logic"),
        ("b", [
            "Propositional logic uses statements joined by AND, OR, NOT, implies.",
            "First-order logic adds objects, predicates and quantifiers: forall x Student(x) -> Studies(x).",
            "Inference methods include modus ponens and resolution.",
        ]),
        ("h", "Machine learning in three types"),
        ("b", [
            "Supervised: learn from labelled examples (classification, regression).",
            "Unsupervised: find structure in unlabelled data (clustering, dimensionality reduction).",
            "Reinforcement: learn actions through rewards and penalties.",
        ]),
        ("h", "A typical supervised workflow"),
        ("code", [
            "1. Collect and clean data",
            "2. Split into train / validation / test sets",
            "3. Pick a model (e.g. decision tree, logistic regression)",
            "4. Train on the training set, tune on validation",
            "5. Report final metrics once on the test set",
        ]),
        ("h", "Overfitting"),
        ("p", "A model that memorizes training noise performs well on training data and poorly on new data. Remedies: more data, simpler models, regularization, early stopping and cross-validation."),
        ("h", "Evaluating classifiers"),
        ("code", [
            "accuracy  = (TP + TN) / (TP + TN + FP + FN)",
            "precision = TP / (TP + FP)",
            "recall    = TP / (TP + FN)",
            "F1        = 2 * precision * recall / (precision + recall)",
        ]),
        ("note", "Worked example: TP=40, FP=10, FN=20, TN=30 -> precision 0.80, recall 0.667, accuracy 0.70."),
        ("h", "Ethics"),
        ("p", "Responsible AI considers bias in data, transparency, privacy and accountability for automated decisions."),
    ],
})

DOCS.append({
    "file": "ai-practice-paper", "kind": "pyq",
    "subject": "Artificial Intelligence",
    "title": "Artificial Intelligence Model Practice Paper",
    "subtitle": "Demo paper - 2026 edition - 50 marks",
    "blocks": [
        ("note", "Self-created practice paper for NoteNest, not an official university paper."),
        ("h", "Section A - Short answers (5 x 4 marks)"),
        ("q", "Define a rational agent and list the types of agent programs.", 4),
        ("q", "What makes a heuristic admissible?", 4),
        ("q", "Differentiate between BFS and DFS in terms of completeness and memory.", 4),
        ("q", "Differentiate between supervised and unsupervised learning with an example each.", 4),
        ("q", "Define overfitting and list two ways to reduce it.", 4),
        ("h", "Section B - Long answers (2 x 15 marks)"),
        ("q", "Explain the A* algorithm with the evaluation function f(n) = g(n) + h(n). Prove or argue that A* is optimal with an admissible heuristic.", 15),
        ("q", "A classifier produces TP=45, FP=5, FN=15, TN=35. Compute accuracy, precision, recall and F1. Comment on which metric matters for a spam filter.", 15),
        ("h", "Answer hints"),
        ("b", [
            "Q7: accuracy 0.80, precision 0.90, recall 0.75, F1 about 0.818.",
            "Q7: for a spam filter, high precision avoids blocking real mail.",
        ]),
    ],
})

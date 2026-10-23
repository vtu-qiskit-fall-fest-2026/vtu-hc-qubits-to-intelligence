QuantumGuard
VTU-QFF-HC-0120 | Tier: Online

| | |
|---|---|
| Team | Qubits To Intelligence |
| Team ID | VTU-QFF-HC-0120 |
| Tier | Online |
| Repository | vtu-hc-qubits-to-intelligence |
| Organisation | vtu-qiskit-fall-fest-2026 |
| Event | VTU-QFF Hackathon, VTU-Qiskit Fall Fest 2026 |

Short Pitch: QuantumGuard is an intelligent quantum communication security monitoring system that simulates the BB84 protocol, analyzes QBER, channel noise, and key-generation rate, and generates explainable alerts to identify potential eavesdropping and security anomalies.

TABLE OF CONTENTS
- Team Members
- Problem Statement
- Proposed Solution
- Approach and Architecture
- Tech Stack
- Project Structure
- How to Run
- How to Push Code
- Future Scope
- Submission Checklist
- Resources
- License

TEAM MEMBERS (GITHUB IDS)

Members are added to this repository as collaborators and must accept the GitHub invitation before they can push.

| No. | Name | GitHub Username | Role |
|---|------|-----------------|------|
| 1 | Bavireddy Bhavyasri | [codewithbhavya09](https://github.com/codewithbhavya09) | Team Lead |
| 2 | Shaik Afreen | [Afreen-Shaik10](https://github.com/Afreen-Shaik10) | Developer |
| 3 | Shaik Asma Siddiqua | [LogicCrafts786](https://github.com/LogicCrafts786) | Developer |

PROBLEM STATEMENT

Problem: Quantum communication channels using QKD can be attacked by eavesdroppers, and an attack shows up only as a subtle rise in error rate that is easily confused with ordinary channel noise. Relying on a single fixed threshold makes it hard to tell a real attack from a noisy channel, and the resulting alerts are rarely explained to the operator.

Why it matters: Sectors such as government and defence, banking, healthcare and data centres need to know early whether a quantum-generated key can be trusted. Easy-to-understand security monitoring makes quantum communication safer and more practical to adopt.

Track / Category: Online, Quantum Cryptography and Security

PROPOSED SOLUTION

Solution: QuantumGuard simulates BB84 Quantum Key Distribution with Qiskit and Qiskit Aer, including configurable noise and eavesdropping attacks. A Python backend analyzes the results and an interactive dashboard shows channel analysis, security alerts, benchmarking and simulation history.

Key idea: Multi-signal anomaly detection (QBER + channel noise + key-generation rate) compared against a calibrated 4.0% baseline and the 11% Shor-Preskill security limit, producing explainable alerts.

Why this works: Combining several signals instead of one fixed threshold separates natural noise from likely eavesdropping. When QBER exceeds the security boundary, the system flags the affected key as untrustworthy and explains why.

Key Features:
- BB84 QKD simulation with configurable noise and eavesdropping attacks
- Multi-signal monitoring: QBER, channel noise, key-generation rate
- Calibrated 4.0% baseline and 11% Shor-Preskill limit
- Explainable alerts with reasons when a key cannot be trusted
- Interactive dashboard: channel analysis, security alerts, benchmarking, simulation history

Potential Applications: Government and defence, banking, healthcare, data centres, quantum communication research

APPROACH AND ARCHITECTURE

1. Input: Simulation parameters such as number of qubits, noise level, eavesdropper on/off and attack strength.
2. Preprocessing: Random generation of Alice's bits and bases, Bob's random measurement bases, and encoding of qubits.
3. Quantum core: BB84 circuits built in Qiskit, with optional Eve interception and a noise model, run on AerSimulator.
4. Post-processing: Basis sifting, QBER calculation, key-rate estimation, noise analysis and comparison against the 4.0% baseline and 11% limit.
5. Output: Dashboard with security status, explainable alerts, benchmarking charts and simulation history.

```
Alice --> Quantum Channel (noise / Eve) --> Bob
                   |
          Qiskit Aer Simulation
                   |
   QBER, Noise, Key Rate Analysis
                   |
     Anomaly Detection + Alert Engine
                   |
        Interactive Dashboard
```

TECH STACK

| Layer | Technology |
|-------|------------|
| Language | Python 3.11+ |
| Quantum SDK | Qiskit >=1.0, Qiskit Aer |
| Protocol | BB84 Quantum Key Distribution |
| Analysis | NumPy, Pandas |
| Simulation | AerSimulator (noise model) |
| Dashboard | Streamlit / Plotly |
| Environment | JupyterLab / VS Code, venv |
| Version control | Git + GitHub |

PROJECT STRUCTURE

```
vtu-hc-qubits-to-intelligence/
|-- README.md              This file
|-- requirements.txt       Python dependencies
|-- pyproject.toml         Project metadata (optional)
|-- .gitignore
|-- notebooks/             Jupyter notebooks for experiments
|   |-- exploration.ipynb
|-- src/
|   |-- __init__.py
|   |-- circuit.py         BB84 circuit construction (noise / Eve)
|   |-- analysis.py        QBER, noise and key-rate analysis
|   |-- detector.py        Anomaly detection and alerts
|   |-- dashboard.py       Interactive dashboard
|   |-- main.py            Entry point
|-- data/                  Simulation history and benchmarks
|-- tests/                 Unit tests
|   |-- test_circuit.py
|-- docs/                  Notes, diagrams, reports
```

HOW TO RUN

Prerequisites: Python 3.11 or newer, Git, and a GitHub account with collaborator access to this repo.

1. Clone the repository
```bash
git clone https://github.com/vtu-qiskit-fall-fest-2026/vtu-hc-qubits-to-intelligence.git
cd vtu-hc-qubits-to-intelligence
```

2. Create a virtual environment
```bash
python3 -m venv .venv
source .venv/bin/activate
```
On Windows (PowerShell) use: .venv\Scripts\activate

3. Install dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

4. Run
```bash
python -m src.main
```
Launch the dashboard:
```bash
streamlit run src/dashboard.py
```
Or launch the notebook workflow:
```bash
jupyter lab
```

5. Run the tests
```bash
pytest -q
```

HOW TO PUSH CODE

Configure Git (first time only):
```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

Everyday workflow:

Step 1: Get the latest changes
```bash
git checkout main
git pull origin main
```

Step 2: Create a branch for your work
```bash
git checkout -b feature/my-task
```

Step 3: Commit your work
```bash
git add .
git commit -m "feat: add BB84 circuit with eavesdropper simulation"
```

Step 4: Push the branch
```bash
git push -u origin feature/my-task
```

Step 5: Open a Pull Request on GitHub and request a review
https://github.com/vtu-qiskit-fall-fest-2026/vtu-hc-qubits-to-intelligence/compare/main...feature/my-task

Step 6: After approval, merge into main
```bash
git checkout main
git pull origin main
git branch -d feature/my-task
```

Commit message convention:

| Prefix | Meaning |
|--------|---------|
| feat: | New feature |
| fix: | Bug fix |
| docs: | Documentation only |
| test: | Adding or fixing tests |
| refactor: | Code restructure, no behaviour change |
| chore: | Build/config/dependency changes |

Collaborating on the same repo:
- Never push directly to main; open a Pull Request.
- Pull before you push to avoid rejected commits.
- Commit often with clear messages.
- Resolve conflicts locally: git pull --rebase, fix the files, then git add + git rebase --continue.
- Ask for a review before merging.

FUTURE SCOPE
- Testing on real quantum hardware via IBM Quantum
- Machine-learning-based anomaly detection
- Support for additional quantum communication protocols

SUBMISSION CHECKLIST
- [ ] Repository created and public
- [ ] All team members added as collaborators and invitations accepted
- [ ] README.md updated with project details, problem statement and solution
- [ ] Team members listed under Team Members
- [ ] requirements.txt committed and project runs from a clean clone
- [ ] Code pushed to main and the latest main builds successfully
- [ ] Notebooks committed with cleared outputs (or use nbstrip)
- [ ] README includes a demo screenshot / video link
- [ ] Short project summary submitted on the hackathon portal

RESOURCES

| Resource | Link |
|----------|------|
| Qiskit documentation |[ https://docs.quantum.ibm.com/](url) |
| Qiskit Runtime and primitives | [https://quantum.cloud.ibm.com/docs/](url) |
| Qiskit Aer simulator | [https://docs.quantum.ibm.com/guides/simulator](url) |
| IBM Quantum Platform | [https://quantum.cloud.ibm.com/ ](url)|
| Qiskit textbook | https://qiskit.qotlabs.org/learning/ |
| GitHub Docs | https://docs.github.com/ |

LICENSE

Released under the MIT License. See LICENSE for details.

---
name: generate-readme
description: >-
  Use this skill to generate, scaffold, or format GitHub repository README.md files
  following the standardized project documentation template and style conventions.
---

# Generate Project README

This skill provides step-by-step instructions for creating or updating a project `README.md` following the standardized layout used across projects.

## Structure and Sections

Every project README generated with this skill must follow this consistent layout:

1. **Header (Centered)**:
   - Centered `<h1 align="center">` with an emoji followed by the project name.
   - Centered `<p align="center">` containing a concise, catchy tagline or value proposition.

2. **The Problem (`## 🤔 The Problem`)**:
   - Concise explanation of the problem, friction, or motivation behind creating this project.

3. **The Solution (`## 💡 The Solution`)**:
   - Description of how this project solves the problem.
   - Bulleted list of key features and capabilities.

4. **Screenshots (`## 🖥 Screenshots`)**:
   - Centered responsive image container using:
     ```html
     <div align="center">
       <img width="49%" alt="Screenshot 1" src="..." />
       <img width="49%" alt="Screenshot 2" src="..." />
     </div>
     ```

5. **Technologies Used (`## 🔬 Technologies Used`)**:
   - Shields.io badges using `style=for-the-badge`.
   - Format:
     ```markdown
     ![Tech](https://img.shields.io/badge/-TECH_NAME-FF0000?style=for-the-badge&logo=logoname&logoColor=white&color=hex)
     ```

6. **Setup (`## ⌨️ Setup`)**:
   - Step-by-step local development setup instructions:
     1. Clone repository
     2. Install dependencies (prefer `bun install`)
     3. Start dev server (`bun run dev`)

7. **Status (`## 📈 Status`)**:
   - Current status of the project (e.g., completed, actively maintained, WIP).
   - Encouragement to report issues or contribute.

8. **Inspirations (`## 💡 Inspirations`)**:
   - Credits, design inspiration, or origin stories.

9. **License (`## 📄 License`)**:
   - Copyright notice and license type (e.g., MIT).

## Template Reference

When generating a README, use the template file at:
[template.md](./resources/template.md)

## Example

Refer to a complete real-world example:
[clean-sudoku.md](./examples/clean-sudoku.md)

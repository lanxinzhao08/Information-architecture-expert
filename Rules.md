# Information Architecture Rules

This file is read by the reviser (an AI agent) on every request. It defines the required information architecture (IA) for a product or feature: the topic structure, the content of overview pages, and the order of topics.

Keep the headings `### Rule A1` and `### Rule A2` exactly as written. The app uses them to tell the two scope rules apart. Blocks wrapped in `<!-- product-only -->` and `<!-- /product-only -->` are read only for product scope. If this file is empty, a built-in default is used.

## How to apply these rules

1. **Choose the scope from the URL.**
   - Product URL: apply Rule A1, Rule B, and Rule C. Include `product-only` blocks.
   - Feature URL: apply Rule A2, Rule B, and Rule C. Skip every `product-only` block.
   - State the scope you chose before producing the structure.
2. **Apply the rules in this order:** Rule A (structure), then Rule B (overview page content), then Rule C (topic ordering).
3. **If rules appear to conflict,** follow Rule A for section structure, Rule B for overview content, and Rule C for ordering.
4. **Finish with the checklist** at the end of this file.

## Glossary

- **Product area:** A major grouping of related products or features, such as Billing.
- **Product:** A complete platform or offering that serves one or more user roles.
- **Feature:** A capability within a product area, such as Orders and subscriptions management.
- **Task:** A step-by-step user goal within a feature, such as "Create a product."
- **Task reference topic:** Supporting information a user needs to complete one specific task. It is subordinate to that task.
- **Feature reference:** Reference material for a whole feature: concepts, configuration fields, API details, and examples.
- **Business workflow:** An end-to-end business path made of tasks from one or more features.
- **Overview:** A conceptual topic that answers "What is it?" and related questions. See Rule B.
- **Shared product reference:** Material that applies across the whole product, not to one feature.
- **EA:** Early access. **GA:** General availability.
- **PRP / PRPC:** Product Rate Plan / Product Rate Plan Charge (Zuora terminology).

## Rule A: Structure by scope

### Rule A1: Product-level information architecture

Apply this rule when the scope is a product. Arrange the topics in this order:

1. **Product overview** (see Rule B).
2. **Business process overview**, including diagrams.
3. **Features**. Repeat this group for each feature:
   - Feature overview.
   - Tasks, in user-workflow order. Place each task's reference topics directly under it, if any exist.
   - Feature reference, containing:
     - Concepts and terminology
     - Configuration field reference
     - API reference (if applicable)
     - Use cases and examples
4. **Business workflows** (if any exist). Repeat this group for each workflow. List the tasks it uses, and name each task with its feature, for example "Feature A: Task a."
5. **Shared product reference**, containing:
   - Product-wide concepts
   - Shared terminology
   - Cross-feature behavior
   - Developer resources

Use this skeleton, replacing the `{placeholders}`:

```
Product overview
Business process overview (with diagrams)
Features
  {Feature A}
    {Feature A} overview
    {Task a}
      {Task a} reference topics (if any)
    {Task b}
    {Feature A} reference
      Concepts and terminology
      Configuration field reference
      API reference (if applicable)
      Use cases and examples
  {Feature B}
    ...
Business workflows (if any)
  {Workflow 1}
    {Feature A}: {Task a}
    {Feature A}: {Task b}
    {Feature B}: {Task c}
Shared product reference
  Product-wide concepts
  Shared terminology
  Cross-feature behavior
  Developer resources
```

### Rule A2: Feature-level information architecture

Apply this rule when the scope is a single feature. Use only the feature group from Rule A1. Do not add product-level sections, workflows, or shared product reference.

```
{Feature A}
  {Feature A} overview
  {Feature A} process overview (if any)
  {Task a}
    {Task a} reference topics (if any)
  {Task b}
    {Task b} reference topics (if any)
  {Feature A} reference
    Concepts and terminology
    Configuration field reference
    API reference (if applicable)
    Use cases and examples
```

## Rule B: Overview page content

### B1. Titles

Use the pattern `{Product | Feature | Capability | Process} overview`.

Examples: "Billing overview" (product), "Orders and subscriptions overview" (feature), "Subscription renewal process overview" (process).

### B2. Length

An overview page must have at least three sentences. If the source material is too sparse, either add relevant context or merge the topic into a broader section.

### B3. Section order (feature, capability, and process overviews)

Write the opening as one to three paragraphs that answer "What is it?" Do not add a heading called "Overview" for the opening. After the opening, use these headings, in this order:

1. **Benefits**. Answers "What benefits does it provide?" Describe the value or outcome for typical use cases.
2. **Prerequisites and required permissions**. Answers "What is required before using it?" List required configuration, user roles, and access levels.
3. **Additional information** or **Considerations**. Answers "What else should I know?" Include system limitations and critical considerations.

For EA features only, a "Known limitations/Constraints" subsection may appear inside this section. Rename or remove it when the feature reaches GA.

<!-- product-only -->
### B4. Product overview (product scope only)

Use this template:

1. **Definition.** One sentence in this form: "[Product] is a [platform] for [user roles] to [do Y]."
2. **Business outcomes.** A few sentences on how users achieve business outcomes with the product.
3. **How it works.** A simple conceptual model diagram showing how the product works or interoperates with other systems.
4. **Capabilities.** A more detailed description of what the product can do.
5. **Key components.** A list of each component, with a link to its topic. Example for Billing: Billing settings configuration; Orders and subscriptions management; Billing documents management.
6. **Core concepts and features** (if applicable).
<!-- /product-only -->

## Rule C: Topic ordering and hierarchy

<!-- product-only -->
### C1. Product areas (product scope only)

Every product area has two separate pages: an overview page and a business process overview page.
<!-- /product-only -->

### C2. Sequence follows the user

Arrange topics in the order a user works through them. Example: Create a product → Create a PRP → Create a PRPC.

### C3. Primary path first

- The primary end-to-end user path forms the main navigation trunk.
- Advanced capabilities, edge cases, and optional add-ons come after the primary path, as subordinate sub-topics or appended sections.

### C4. Reference topics sit under their tasks

- A reference topic that relates to only certain tasks goes under those tasks.
- A reference topic that serves the whole feature goes in the feature reference.

### C5. Nice-to-have information comes last

Place key concepts and special circumstances after the primary information.

## Checklist before finishing

- [ ] Scope was chosen from the URL and stated.
- [ ] `product-only` blocks were used only for product scope.
- [ ] Each feature has an overview, tasks, and a feature reference.
- [ ] Each overview has at least three sentences and follows the title pattern in B1.
- [ ] Each overview uses the opening, then Benefits, Prerequisites and required permissions, and Additional information or considerations, in that order.
- [ ] Reference topics appear under the tasks they relate to.
- [ ] The primary path comes first, and nice-to-have information comes last.
- [ ] Any EA-only limitations section is flagged for removal at GA.
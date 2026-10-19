# Information Architecture Rules

The reviser reads this file on every request. When the URL is a product, it
applies Rule A1. When the URL is a feature, it applies Rule A2. Rules B and C
always apply. Edit freely: plain prose, numbered lists, or headings all work.
Keep the `### Rule A1` and `### Rule A2` headings so the app can tell them
apart. If this file is empty, a built-in default is used.

## Rule A: Implement the information architecture design dependent on whether the specified URL is for a product or for a feature

### Rule A1: Product-level information architecture
For each product area, use the following structure:

- Product overview
- Business process overview (including the diagrams)
- Feature-based 
  - Feature A
    - Feature A overview
    - Task a
      - Task a reference topics, if applicable
    - Task b
    - Feature A reference
      - Concepts and terminology
      - Configuration field reference
      - API reference, if applicable
      - Use cases/Examples for Feature A
  - Feature B
    - Feature B overview
    - Task c
    - Task d
    - Feature B reference
      - Concepts and terminology
      - Configuration field reference
      - API reference, if applicable
      - Use cases/Examples for Feature B
- Workflow-based, if exists
  - Business workflow 1
    - Feature A - task a
    - Feature A - task b
    - Feature B - task c
  - Business workflow 2
    - Feature B - task c
    - Feature B - task d
- Shared product reference, such as: 
  - Product-wide concepts 
  - Shared terminology
  - Cross-feature behavior
  - Developer resources

### Rule A2: Feature-level information architecure

For each product area, use the following structure:

- Feature A
  - Feature A overview
  - Task a
    - Task a reference topics, if applicable
  - Task b
    - Task b reference topics, if applicable
  - Feature A reference
    - Concepts and terminology
    - Configuration field reference
    - API reference, if applicable
    - Use cases/Examples for Feature A
- Feature B
  - Feature B overview
  - Task c
  - Task d
  - Feature B reference
    - Concepts and terminology
    - Configuration field reference
    - API reference, if applicable
    - Use cases/Examples for Feature B


## Rule B: Follow the following "Overview" page depth and structure

* **Title formulation:** Use the standard naming convention: \[Product / Feature / Capability / Process\] overview.  
* **Content depth:** Avoid single-paragraph or overly brief overview pages (fewer than three sentences). If content is sparse, either expand the topic with relevant context or consolidate it into a broader section.  
* **Standard structural framework:** Maintain structural consistency across all feature-level overview topics by adhering to the following section hierarchy:  
  * The first few paragraphs should be the overview that defines the core concept (*"What is it?"*). Do not add a section called "Overview".  
  * **Benefits:** Details the value proposition or outcome for typical use cases (*"What benefits does it provide?"*).  
  * **Prerequisites & Required permissions:** Specifies necessary configurations, user roles, or access levels (*"What is required before using it?"*).  
  * **Additional information or considerations:** Includes additional information like system limitations or critical considerations (*"What else should I know?"*). For EA features, "Known limitations/Constraints" section is temporarily allowed, but this section should be renamed or removed once it reaches GA.  
* Product-level overview should follow this template (*ideal state*):  
  * A few sentences about   
1. Definition of the product like "Product X is a platform for \[user roles\] to \[do Y\]."  
2. How can users use it to achieve business outcomes.  
   * **How it works:** A simple conceptual model diagram to show how it works or interoperates with other systems.  
   * **Capabilities**: A more detailed description of what it can do.  
   * **Key components**: List each component in this product and provide references to respective topics. For example, key components for Billing would be "Billing settings configuration", "Orders and subscriptions management", "Billing documents management".   
   * **Core concepts and features (if applicable)**

## Rule C: Follow the following content hierarchy

* **High-level structure and process:**   
  * Every product area should have an overview page, and a separate process overview page.  
* **Logical sequencing:** Arrange topics in a sequence that mirrors user workflows and business logic (for example, *Create a Product* —\> *Create a PRP* —\> *Create a PRPC*).  
* **Primary vs. advanced workflows:**   
  * Establish the primary end-to-end user path as the main navigation trunk. Feature advanced capabilities, edge cases, and optional add-ons as subordinate sub-topics or appended sections.  
  * If some reference topics are only related to certain tasks, reference topics should always be subordinate to the tasks they relate to.  
  * Conceptual information that is "nice to have" like key concepts or special circumstances should always be placed after the primary information. 



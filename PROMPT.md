I want to design an agent skill that helps users read books in a gamified way, referencing the ideas from [ref/游戏化阅读技能设计文档.md]. This skill needs to have a gamified style and invoke some tools to display interactive interfaces (based on a JS tech stack). It needs to implement at least the following:

1. Process user-uploaded epub books. The tool should use the epub2MD library to load the book and split it into markdown files stored locally.
2. Gamify the book reading process based on the design concepts in [ref/游戏化阅读技能设计文档.md].
3. Store book-related information in a local database (SQLite).

You need to implement the text description part of this skill. If script implementation is involved, you don't need to provide the concrete implementation for now; just generate the corresponding interfaces (empty implementation) and descriptions for them. Please refer to the [skill-creator] skill when creating the new skill. Finally, also output an architecture design document. All output artifacts (skill and architecture design document) should be placed in the project's `output` folder.

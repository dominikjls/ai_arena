# AI Arena

AI Arena is an application designed to leverage AI models for various tasks. This README provides instructions for setting up the environment, managing models with Ollama, and running the application.

Currently run data ist stored in IndexedDB and if it needs clearing, use developer tools.

## Prerequisites

- [Ollama](https://ollama.com/) installed on your system.
- [pnpm](https://pnpm.io/) installed for managing dependencies.

## Installation

1. **Install Ollama**  
   Follow the instructions on the [Ollama website](https://ollama.com/) to download and install Ollama on your system.

2. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd ai_arena
   ```

3. **Install Dependencies**  
   Use `pnpm` to install the required dependencies:
   ```bash
   pnpm install
   ```

## Managing Models with Ollama

1. **List Available Models**  
   To see the list of locally available models, run:

   ```bash
   ollama ls
   ```

2. **Add a Model**  
   To add a new model, use:

   ```bash
   ollama pull <model-name>
   ```

3. **Remove a Model**  
   To remove a model, run:
   ```bash
   ollama rm <model-name>
   ```

## Running the Application

Once Ollama is installed and the necessary models are added, you can start the application by running:

```bash
pnpm run dev
```

This will launch the development server for AI Arena.

## Contributing

Feel free to submit issues or pull requests to improve the application.

## License

This project is licensed under the terms of the [MIT License](./LICENSE).

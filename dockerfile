FROM node:22-bookworm-slim

# Install curl and tar
RUN apt-get update && apt-get install -y curl tar git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /home/app

# Download and install GitHub CLI
RUN curl -L https://github.com/cli/cli/releases/download/v2.35.0/gh_2.35.0_linux_amd64.tar.gz -o gh-cli.tar.gz && \
    tar -xvzf gh-cli.tar.gz && \
    cp gh_2.35.0_linux_amd64/bin/gh /usr/local/bin/ && \
    rm -rf gh-cli.tar.gz gh_2.35.0_linux_amd64

RUN gh auth login

# Clone the repository from GitHub
RUN gh repo clone https://github.com/UNNESTech-UNNES/facetro-be.git

# Change dir to the downloaded repository
WORKDIR /home/app/facetro-be

COPY . .

# Install npm packages
RUN npm install

EXPOSE 3000

# Command to run your application
CMD ["/bin/bash", "-c", "tail -f /dev/null"]
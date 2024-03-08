FROM postgres:16.2

RUN apt-get update && apt-get install -y curl unzip

RUN curl -fsSL https://bun.sh/install | bash

ENV PATH="/root/.bun/bin:${PATH}"

COPY ./index.ts .

CMD ["bun", "index.ts"]

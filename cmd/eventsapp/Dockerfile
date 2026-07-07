FROM golang:1.26.4-bookworm AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/cmd/eventsapp/exe /app/cmd/eventsapp

FROM alpine:3.24
WORKDIR /app
COPY --from=builder /app/cmd/eventsapp/exe /app
COPY --from=builder /app/public /app/public
ENV PROJECT_ROOT=/app
CMD [ "/app/exe" ]
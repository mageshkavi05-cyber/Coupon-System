pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        IMAGE_NAME = 'coupon-system-v3'
        CONTAINER_NAME = 'coupon-system-v3'
        HOST_PORT = '3003'
        CONTAINER_PORT = '3000'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install and Test') {
            steps {
                sh 'npm ci'
                sh 'npm test'
            }
        }

        stage('Build and Push Docker Image') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKERHUB_USER',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {
                    sh '''
                        set -eu
                        IMAGE="$DOCKERHUB_USER/$IMAGE_NAME:latest"

                        docker build -t "$IMAGE" .

                        printf '%s' "$DOCKERHUB_TOKEN" |
                            docker login --username "$DOCKERHUB_USER" --password-stdin

                        docker push "$IMAGE"
                        docker logout
                    '''
                }
            }
        }

        stage('Deploy V3') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKERHUB_USER',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {
                    sh '''
                        set -eu
                        IMAGE="$DOCKERHUB_USER/$IMAGE_NAME:latest"

                        docker pull "$IMAGE"

                        docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

                        docker run -d \
                            --name "$CONTAINER_NAME" \
                            --restart unless-stopped \
                            -p "$HOST_PORT:$CONTAINER_PORT" \
                            "$IMAGE"

                        docker ps --filter "name=$CONTAINER_NAME"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'V3 pipeline completed successfully.'
        }
        failure {
            echo 'V3 pipeline failed. Check the stage logs.'
        }
    }
}

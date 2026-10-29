
pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }
    
    parameters {
        string(
            name: 'BUILD_MESSAGE',
            defaultValue: 'Coupon System CI Build',
            description: 'Message for this build'
        )

        booleanParam(
            name: 'PUSH_IMAGE',
            defaultValue: true,
            description: 'Build and push the Docker image to Docker Hub'
        )

        booleanParam(
            name: 'DEPLOY_TO_K8S',
            defaultValue: false,
            description: 'Deploy the application to Kubernetes'
        )
    }

    environment {
    	PATH = "C:\\Users\\mageshkumar sankar\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;${env.PATH}"
    	IMAGE_NAME = 'mageshkavi05/coupon-system'
    	IMAGE_TAG = "${BUILD_NUMBER}"
    }
    stages {

        stage('Checkout from GitHub') {
            steps {
                checkout scm
                bat 'echo GitHub checkout completed'
                bat 'dir'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'node --version'
                bat 'npm.cmd --version'
                bat 'npm.cmd install'
            }
        }

        stage('Parallel Stages') {
            parallel {
                stage('Node Version') {
                    steps {
                        bat 'node --version'
                    }
                }

                stage('NPM Version') {
                    steps {
                        bat 'npm.cmd --version'
                    }
                }

                stage('List Project Files') {
                    steps {
                        bat 'dir'
                    }
                }
            }
        }

        stage('Run Application Tests') {
            steps {
                bat 'npm.cmd test'
            }
        }

        stage('Create Build Artifact') {
            steps {
                bat 'if not exist build mkdir build'
                bat 'echo Coupon System Build > build\\build-info.txt'
                bat 'echo Build Number: %BUILD_NUMBER% >> build\\build-info.txt'
                bat 'echo Build Message: %BUILD_MESSAGE% >> build\\build-info.txt'
                archiveArtifacts(
                    artifacts: 'build/build-info.txt',
                    fingerprint: true
                )
            }
        }

        stage('Build Docker Image') {
            when {
                expression {
                    params.PUSH_IMAGE || params.DEPLOY_TO_K8S
                }
            }
            steps {
                bat 'docker version'
                bat 'docker build -t %IMAGE_NAME%:%IMAGE_TAG% -t %IMAGE_NAME%:latest .'
            }
        }

        stage('Push Image to Docker Hub') {
            when {
                expression {
                    params.PUSH_IMAGE
                }
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    bat 'powershell -NoProfile -NonInteractive -Command "$env:DOCKER_PASS | docker login --username $env:DOCKER_USER --password-stdin"'

                    bat 'docker push %IMAGE_NAME%:%IMAGE_TAG%'
                    bat 'docker push %IMAGE_NAME%:latest'

                    bat 'docker logout'
                }
            }
        }

        stage('Deploy to Kubernetes') {
            when {
                expression {
                    params.DEPLOY_TO_K8S
                }
            }
            steps {
                bat 'kubectl apply -f k8s\\00-namespace.yaml'
                bat 'kubectl apply -f k8s\\10-deployment.yaml'
                bat 'kubectl apply -f k8s\\20-service.yaml'

                bat 'kubectl set image deployment/coupon-system coupon-system=%IMAGE_NAME%:%IMAGE_TAG% -n coupon-system'

                bat 'kubectl rollout status deployment/coupon-system -n coupon-system --timeout=120s'
            }
        }
    }

    post {
        success {
            echo 'Coupon System pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Check the Jenkins Console Output.'
        }

        always {
            echo 'Coupon System CI/CD pipeline finished.'
        }
    }
}



pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    environment {
        DOCKER = 'C:\\Users\\mageshkumar sankar\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
        KUBECTL = 'C:\\Users\\mageshkumar sankar\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\kubectl.exe'
        IMAGE = 'mageshkavi05/coupon-system-v2'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                bat 'git branch --show-current'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm.cmd ci'
            }
        }

        stage('Test') {
            steps {
                bat 'npm.cmd test'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat '''
                    "%DOCKER%" build -t "%IMAGE%:%BUILD_NUMBER%" -t "%IMAGE%:latest" .
                '''
            }
        }

        stage('Docker Hub Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_TOKEN'
                )]) {
                    bat '''
                        echo %DOCKER_TOKEN%| "%DOCKER%" login --username "%DOCKER_USER%" --password-stdin
                    '''
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                bat '''
                    "%DOCKER%" push "%IMAGE%:%BUILD_NUMBER%"
                    "%DOCKER%" push "%IMAGE%:latest"
                    "%DOCKER%" logout
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([file(
                    credentialsId: 'coupon-kubeconfig',
                    variable: 'KUBECONFIG_FILE'
                )]) {
                    bat '''
                        set "KUBECONFIG=%KUBECONFIG_FILE%"
                        "%KUBECTL%" apply -f k8s/v2.yaml
                        "%KUBECTL%" set image deployment/coupon-v2 coupon-v2=%IMAGE%:%BUILD_NUMBER%
                        "%KUBECTL%" rollout status deployment/coupon-v2 --timeout=180s
                        "%KUBECTL%" get deployment coupon-v2
                        "%KUBECTL%" get service coupon-v2-service
                    '''
                }
            }
        }
    }

    post {
        always {
            bat '''
                if exist docker-auth rmdir /s /q docker-auth
            '''
        }
        success {
            echo 'V2 pipeline completed successfully!'
        }
        failure {
            echo 'V2 pipeline failed. Check the stage logs.'
        }
    }
}

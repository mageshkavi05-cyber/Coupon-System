pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    environment {
        IMAGE_NAME = 'mageshkavi05/coupon-system-v1'
        DOCKER = 'C:\\Users\\mageshkumar sankar\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
        KUBECTL = 'C:\\Users\\mageshkumar sankar\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\kubectl.exe'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
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
                    "%DOCKER%" build -t %IMAGE_NAME%:%BUILD_NUMBER% .
                    if errorlevel 1 exit /b 1
                    "%DOCKER%" tag %IMAGE_NAME%:%BUILD_NUMBER% %IMAGE_NAME%:latest
                '''
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_TOKEN'
                )]) {
                    bat '''
                        echo %DOCKER_TOKEN%| "%DOCKER%" login --username "%DOCKER_USER%" --password-stdin
                        if errorlevel 1 exit /b 1
                        "%DOCKER%" push %IMAGE_NAME%:%BUILD_NUMBER%
                        if errorlevel 1 exit /b 1
                        "%DOCKER%" push %IMAGE_NAME%:latest
                        if errorlevel 1 exit /b 1
                        "%DOCKER%" logout
                    '''
                }
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
                        "%KUBECTL%" apply -f k8s/v1.yaml
                        if errorlevel 1 exit /b 1
                        "%KUBECTL%" set image deployment/coupon-v1 coupon-v1=%IMAGE_NAME%:%BUILD_NUMBER%
                        if errorlevel 1 exit /b 1
                        "%KUBECTL%" rollout status deployment/coupon-v1 --timeout=180s
                        if errorlevel 1 exit /b 1
                        "%KUBECTL%" get deployment coupon-v1
                        "%KUBECTL%" get service coupon-v1-service
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'V1 pipeline finished.'
        }
    }
}

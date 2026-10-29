
pipeline {
    agent any

    environment {
        IMAGE = 'YOUR_DOCKERHUB_USERNAME/coupon-system-v3:latest'
        DOCKER = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe'
        KUBECTL = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\kubectl.exe'
    }

    stages {
        stage('Checkout Verification') {
            steps {
                bat 'git log -1 --oneline'
            }
        }

        stage('Install and Test') {
            steps {
                bat 'npm ci'
                bat 'npm test'
            }
        }

        stage('Docker Build') {
            steps {
                bat '"%DOCKER%" build -t %IMAGE% .'
            }
        }

        stage('DockerHub Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_TOKEN'
                )]) {
                    bat '''
                        @echo off
                        setlocal DisableDelayedExpansion

                        set "DOCKER_CONFIG=%WORKSPACE%\\docker-auth"
                        if not exist "%DOCKER_CONFIG%" mkdir "%DOCKER_CONFIG%"

                        echo ===== DockerHub Login =====
                        "%DOCKER%" login --username "%DOCKER_USER%" --password-stdin < nul
                    '''
                    bat '''
                        @echo off
                        setlocal DisableDelayedExpansion

                        set "DOCKER_CONFIG=%WORKSPACE%\\docker-auth"
                        echo %DOCKER_TOKEN%| "%DOCKER%" login --username "%DOCKER_USER%" --password-stdin
                        if errorlevel 1 exit /b 1

                        echo ===== DockerHub Push =====
                        "%DOCKER%" push "%IMAGE%"
                        if errorlevel 1 exit /b 1

                        "%DOCKER%" logout
                    '''
                }
            }
        }

        stage('Kubernetes Deploy') {
            steps {
                withCredentials([file(
                    credentialsId: 'coupon-kubeconfig',
                    variable: 'KUBECONFIG'
                )]) {
                    bat '''
                        @echo off

                        echo ===== Apply Kubernetes Configuration =====
                        "%KUBECTL%" apply -f k8s/v3.yaml
                        if errorlevel 1 exit /b 1

                        echo ===== Restart Deployment =====
                        "%KUBECTL%" rollout restart deployment/coupon-v3
                        if errorlevel 1 exit /b 1

                        echo ===== Wait for Deployment =====
                        "%KUBECTL%" rollout status deployment/coupon-v3 --timeout=120s
                        if errorlevel 1 exit /b 1

                        echo ===== Deployment Status =====
                        "%KUBECTL%" get deployment coupon-v3
                        if errorlevel 1 exit /b 1

                        echo ===== Service Status =====
                        "%KUBECTL%" get services
                    '''
                }
            }
        }
    }

    post {
        always {
            bat '''
                @echo off
                if exist "%WORKSPACE%\\docker-auth" rmdir /s /q "%WORKSPACE%\\docker-auth"
            '''
        }
    }
}
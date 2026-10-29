
pipeline {
    agent any

    environment {
        IMAGE = 'mageshkavi05/coupon-system-v3:latest'
        DOCKER = 'C:\\Users\\mageshkumar sankar\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
        KUBECTL = 'C:\\Users\\mageshkumar sankar\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\kubectl.exe'
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
                    powershell '''
                        $ErrorActionPreference = 'Stop'
                        $env:DOCKER_CONFIG = Join-Path $env:WORKSPACE 'docker-auth'
                        New-Item -ItemType Directory -Force -Path $env:DOCKER_CONFIG | Out-Null

                        $token = $env:DOCKER_TOKEN
                        if ([string]::IsNullOrWhiteSpace($token)) {
                            throw 'Docker Hub token is empty. Check Jenkins credential dockerhub-creds.'
                        }

                        $token | & $env:DOCKER login --username $env:DOCKER_USER --password-stdin
                        if ($LASTEXITCODE -ne 0) {
                            throw 'Docker Hub login failed.'
                        }

                        & $env:DOCKER push $env:IMAGE
                        if ($LASTEXITCODE -ne 0) {
                            throw 'Docker Hub image push failed.'
                        }

                        & $env:DOCKER logout
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
                        if errorlevel 1 exit /b 1
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
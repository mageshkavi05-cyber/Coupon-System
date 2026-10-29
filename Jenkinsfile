pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    environment {
        IMAGE = 'mageshkavi05/coupon-system-v3'
        DOCKER = 'C:\\Users\\mageshkumar sankar\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
        KUBECTL = 'C:\\Users\\mageshkumar sankar\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\kubectl.exe'
    }

    stages {
        stage('Checkout Verification') {
            steps {
                checkout scm
                bat 'git log -1 --oneline'
            }
        }

        stage('Install and Test') {
            steps {
                bat 'npm.cmd ci'
                bat 'npm.cmd test'
            }
        }

        stage('Docker Build') {
            steps {
                bat '''
                    "%DOCKER%" build ^
                        -t "%IMAGE%:%BUILD_NUMBER%" ^
                        -t "%IMAGE%:latest" .
                '''
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
                        echo %DOCKER_TOKEN%| "%DOCKER%" login --username "%DOCKER_USER%" --password-stdin
                        if errorlevel 1 exit /b 1

                        echo ===== Push Versioned Image =====
                        "%DOCKER%" push "%IMAGE%:%BUILD_NUMBER%"
                        if errorlevel 1 exit /b 1

                        echo ===== Push Latest Image =====
                        "%DOCKER%" push "%IMAGE%:latest"
                        if errorlevel 1 exit /b 1

                        echo ===== DockerHub Logout =====
                        "%DOCKER%" logout
                        if errorlevel 1 exit /b 1
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

                        echo ===== Update Deployment Image =====
                        "%KUBECTL%" set image deployment/coupon-v3 coupon-v3=%IMAGE%:%BUILD_NUMBER%
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
                echo Coupon V3 CI/CD pipeline finished.
            '''
        }

        success {
            echo 'V3 pipeline completed successfully!'
        }

        failure {
            echo 'V3 pipeline failed. Check the Console Output.'
        }
    }
}
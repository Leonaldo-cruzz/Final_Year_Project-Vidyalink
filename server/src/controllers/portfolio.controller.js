import portfolioService from '../services/portfolio.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class PortfolioController {
  getStudentPortfolios = asyncHandler(async (req, res) => {
    const studentId = req.user._id;
    const portfolios = await portfolioService.getStudentPortfolios(studentId);
    return ApiResponse.ok(res, 'Verified portfolios retrieved', portfolios);
  });

  verifyCertificate = asyncHandler(async (req, res) => {
    const { certificateId } = req.params;
    const portfolio = await portfolioService.verifyCertificate(certificateId);
    return ApiResponse.ok(res, 'Certificate verified successfully', portfolio);
  });
}

export default new PortfolioController();

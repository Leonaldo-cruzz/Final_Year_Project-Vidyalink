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

  updateVisibility = asyncHandler(async (req, res) => {
    const portfolio = await portfolioService.updateVisibility(
      req.user._id,
      req.params.portfolioId,
      req.body.isPublic
    );

    return ApiResponse.ok(res, 'Portfolio visibility updated', portfolio);
  });
}

export default new PortfolioController();
